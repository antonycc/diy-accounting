#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

/**
 * Generate AWS Resources Report
 *
 * Catalogues AWS resources in the spreadsheets account from live AWS data.
 * Requires AWS SSO authentication with the spreadsheets profile.
 *
 * Usage:
 *   node scripts/generate-aws-resources.js [--profile PROFILE] [--output FILE]
 *
 * Prerequisites:
 *   aws sso login --sso-session diyaccounting
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
};

const profile = getArg("--profile", "spreadsheets");
const outputFile = getArg("--output", "AWS_RESOURCES.md");

function aws(command) {
  try {
    return execSync(`aws --profile ${profile} ${command}`, {
      encoding: "utf-8",
      timeout: 30000,
    }).trim();
  } catch (error) {
    if (error.message.includes("expired") || error.message.includes("SSO")) {
      console.error(`\nAWS SSO session expired. Please authenticate first:`);
      console.error(`  aws sso login --sso-session diyaccounting\n`);
      process.exit(1);
    }
    return null;
  }
}

function awsJson(command) {
  const result = aws(`${command} --output json`);
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

function getAccountId() {
  const identity = awsJson("sts get-caller-identity");
  return identity?.Account || "unknown";
}

function getCloudFormationStacks() {
  const stacks = awsJson("cloudformation describe-stacks --region us-east-1");
  if (!stacks?.Stacks) return [];
  return stacks.Stacks.map((s) => ({
    name: s.StackName,
    status: s.StackStatus,
    outputs: (s.Outputs || []).map((o) => ({
      key: o.OutputKey,
      value: o.OutputValue,
    })),
  }));
}

function getCloudFrontDistributions() {
  const dists = awsJson("cloudfront list-distributions");
  if (!dists?.DistributionList?.Items) return [];
  return dists.DistributionList.Items.map((d) => ({
    id: d.Id,
    domainName: d.DomainName,
    aliases: d.Aliases?.Items || [],
    status: d.Status,
    enabled: d.Enabled,
  }));
}

function getS3Buckets() {
  const buckets = awsJson("s3api list-buckets");
  if (!buckets?.Buckets) return [];
  return buckets.Buckets.map((b) => b.Name);
}

function getIamRoles() {
  const roles = awsJson("iam list-roles");
  if (!roles?.Roles) return [];
  return roles.Roles.map((r) => ({
    name: r.RoleName,
    path: r.Path,
    arn: r.Arn,
  }));
}

function getCertificates() {
  const certs = awsJson("acm list-certificates --region us-east-1 --certificate-statuses ISSUED");
  if (!certs?.CertificateSummaryList) return [];
  return certs.CertificateSummaryList.map((c) => ({
    arn: c.CertificateArn,
    domain: c.DomainName,
  }));
}

function getLambdaFunctions() {
  const fns = awsJson("lambda list-functions --region us-east-1");
  if (!fns?.Functions) return [];
  return fns.Functions.map((f) => ({
    name: f.FunctionName,
    runtime: f.Runtime || "N/A",
    description: f.Description || "",
  }));
}

function getLogGroups() {
  const logs = awsJson("logs describe-log-groups --region us-east-1");
  if (!logs?.logGroups) return [];
  return logs.logGroups.map((g) => g.logGroupName);
}

function categoriseRole(name) {
  if (name.startsWith("AWSServiceRoleFor")) return "service-linked";
  if (name.startsWith("AWSReservedSSO_")) return "sso";
  if (name === "OrganizationAccountAccessRole") return "org";
  if (name.startsWith("cdk-hnb659fds-")) return "cdk-bootstrap";
  if (name.includes("github-actions") || name.includes("deployment")) return "cicd";
  if (name.includes("SpreadsheetsStack") || name.includes("spreadsheets-Spreadshee") || name.includes("spreadsheets-Spreads"))
    return "stack";
  return "other";
}

function generateReport(accountId, data) {
  const timestamp = new Date().toISOString().split("T")[0];

  const cdkStacks = data.stacks.filter((s) => s.name !== "CDKToolkit" && s.status !== "DELETE_COMPLETE");
  const cdkToolkit = data.stacks.find((s) => s.name === "CDKToolkit");

  const stackBuckets = data.buckets.filter(
    (b) => !b.startsWith("cdk-hnb659fds-") && (b.includes("spreadsheets") || b.includes("originbucket")),
  );
  const cdkBuckets = data.buckets.filter((b) => b.startsWith("cdk-hnb659fds-"));

  const rolesByCategory = {};
  for (const role of data.roles) {
    const cat = categoriseRole(role.name);
    if (!rolesByCategory[cat]) rolesByCategory[cat] = [];
    rolesByCategory[cat].push(role);
  }

  const stackLambdas = data.lambdas.filter(
    (f) => f.name.includes("SpreadsheetsStack") || f.name.includes("CustomCDK") || f.name.includes("CustomS3"),
  );

  const stackLogGroups = data.logGroups.filter((g) => g.includes("spreadsheets") || g.includes("distribution"));

  let md = `# AWS Resources — Spreadsheets Account (${accountId})

Catalogued from AWS CLI on ${timestamp}.

## Managed by This Repo (per environment)

Resources below exist for both \`ci\` and \`prod\` environments. Replace \`{env}\` with \`ci\` or \`prod\`.

| Resource | Name / ID | Purpose |
| -------- | --------- | ------- |
`;

  for (const stack of cdkStacks) {
    md += `| CloudFormation | \`${stack.name}\` | CDK-managed stack (${stack.status}) |\n`;
  }

  for (const dist of data.distributions) {
    const aliases = dist.aliases.length > 0 ? dist.aliases.join(", ") : "none";
    md += `| CloudFront dist | \`${dist.id}\` / \`${dist.domainName}\` | ${aliases} |\n`;
  }

  for (const bucket of stackBuckets) {
    md += `| S3 bucket | \`${bucket}\` | Static site content origin |\n`;
  }

  for (const fn of stackLambdas) {
    const desc = fn.description || "CDK custom resource handler";
    md += `| Lambda | \`${fn.name.length > 60 ? fn.name.substring(0, 57) + "..." : fn.name}\` | ${desc} |\n`;
  }

  if (rolesByCategory.stack) {
    md += `| IAM roles (${rolesByCategory.stack.length}) | \`{env}-spreadsheets-SpreadsheetsStack-*\` | CDK custom resource execution roles |\n`;
  }

  for (const group of stackLogGroups) {
    md += `| CloudWatch log group | \`${group}\` | CloudFront access logs |\n`;
  }

  md += `
## Account-Level Resources

| Resource | ARN / Name | Purpose |
| -------- | ---------- | ------- |
`;

  if (cdkToolkit) {
    md += `| CloudFormation | \`CDKToolkit\` | CDK bootstrap stack |\n`;
  }

  if (rolesByCategory.cicd) {
    for (const role of rolesByCategory.cicd) {
      const purpose = role.name.includes("actions") ? "OIDC auth for GitHub Actions" : "CDK deploy role";
      md += `| IAM role | \`${role.name}\` | ${purpose} |\n`;
    }
  }

  // OIDC provider
  const oidcProviders = awsJson("iam list-open-id-connect-providers");
  if (oidcProviders?.OpenIDConnectProviderList) {
    for (const provider of oidcProviders.OpenIDConnectProviderList) {
      if (provider.Arn.includes("token.actions.githubusercontent.com")) {
        md += `| IAM OIDC provider | \`token.actions.githubusercontent.com\` | GitHub Actions OIDC |\n`;
      }
    }
  }

  for (const cert of data.certificates) {
    md += `| ACM certificate | \`${cert.arn}\` | TLS for CloudFront (${cert.domain}) |\n`;
  }

  for (const bucket of cdkBuckets) {
    const region = bucket.split("-").slice(-2).join("-");
    md += `| S3 bucket | \`${bucket}\` | CDK asset staging (${region}) |\n`;
  }

  if (rolesByCategory["cdk-bootstrap"]) {
    md += `| IAM roles (${rolesByCategory["cdk-bootstrap"].length}) | \`cdk-hnb659fds-*-${accountId}-*\` | CDK bootstrap roles |\n`;
  }

  // SSM parameter
  const ssmVersion = aws(
    "ssm get-parameter --name /cdk-bootstrap/hnb659fds/version --region us-east-1 --query Parameter.Value --output text 2>/dev/null",
  );
  if (ssmVersion) {
    md += `| SSM parameter | \`/cdk-bootstrap/hnb659fds/version\` | CDK bootstrap version (${ssmVersion}) |\n`;
  }

  md += `
## AWS Service-Linked Roles (auto-created, do not delete)

| Role | Service |
| ---- | ------- |
`;

  if (rolesByCategory["service-linked"]) {
    for (const role of rolesByCategory["service-linked"]) {
      const service = role.name
        .replace("AWSServiceRoleFor", "")
        .replace(/([A-Z])/g, " $1")
        .trim();
      md += `| \`${role.name}\` | ${service} |\n`;
    }
  }

  md += `
## Intentional Non-CDK Resources

| Resource | Purpose |
| -------- | ------- |
`;

  if (rolesByCategory.org) {
    md += `| IAM role | \`OrganizationAccountAccessRole\` — cross-account admin access |\n`;
  }

  if (rolesByCategory.sso) {
    const ssoCount = rolesByCategory.sso.length;
    md += `| SSO reserved roles (${ssoCount}) | ${rolesByCategory.sso.map((r) => `\`${r.name}\``).join(", ")} |\n`;
  }

  if (rolesByCategory.other && rolesByCategory.other.length > 0) {
    for (const role of rolesByCategory.other) {
      md += `| IAM role | \`${role.name}\` |\n`;
    }
  }

  md += `\n---\n\n*Generated by \`node scripts/generate-aws-resources.js --profile ${profile}\`*\n`;

  return md;
}

function main() {
  console.log("AWS Resources Report Generator");
  console.log("==============================");
  console.log(`Profile: ${profile}`);
  console.log(`Output: ${outputFile}`);
  console.log("");

  console.log("Authenticating...");
  const accountId = getAccountId();
  console.log(`Account: ${accountId}`);

  console.log("Fetching CloudFormation stacks...");
  const stacks = getCloudFormationStacks();
  console.log(`  Found ${stacks.length} stacks`);

  console.log("Fetching CloudFront distributions...");
  const distributions = getCloudFrontDistributions();
  console.log(`  Found ${distributions.length} distributions`);

  console.log("Fetching S3 buckets...");
  const buckets = getS3Buckets();
  console.log(`  Found ${buckets.length} buckets`);

  console.log("Fetching IAM roles...");
  const roles = getIamRoles();
  console.log(`  Found ${roles.length} roles`);

  console.log("Fetching ACM certificates...");
  const certificates = getCertificates();
  console.log(`  Found ${certificates.length} certificates`);

  console.log("Fetching Lambda functions...");
  const lambdas = getLambdaFunctions();
  console.log(`  Found ${lambdas.length} functions`);

  console.log("Fetching CloudWatch log groups...");
  const logGroups = getLogGroups();
  console.log(`  Found ${logGroups.length} log groups`);

  console.log("\nGenerating report...");
  const report = generateReport(accountId, {
    stacks,
    distributions,
    buckets,
    roles,
    certificates,
    lambdas,
    logGroups,
  });

  const outputPath = join(projectRoot, outputFile);
  writeFileSync(outputPath, report);
  console.log(`\nReport written to: ${outputPath}`);
}

main();
