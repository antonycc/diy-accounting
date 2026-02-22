#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 DIY Accounting Ltd

// Post-process cfn-diagram draw.io output to make labels human-readable.
// Usage: node scripts/clean-drawio.cjs <input.drawio> [output.drawio]
const fs = require("fs");

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile;
if (!inputFile) {
  console.error("Usage: node scripts/clean-drawio.cjs <input.drawio> [output.drawio]");
  process.exit(1);
}

let xml = fs.readFileSync(inputFile, "utf8");

// Helper: remove mxCell elements matching an attribute pattern.
// Handles both self-closing <mxCell .../> and cells with children <mxCell ...>...</mxCell>.
// Uses [^>]*/> for self-closing (backtracking handles / in attribute values)
// and negative lookbehind (?<!/) to avoid matching self-closing tags as open tags.
function removeCells(xmlStr, attrPattern, flags = "") {
  const selfClose = new RegExp(`<mxCell[^>]*${attrPattern}[^>]*/>`, "g" + flags);
  const withChildren = new RegExp(`<mxCell[^>]*${attrPattern}[^>]*(?<!/)>.*?</mxCell>`, "g" + flags);
  return xmlStr.replace(selfClose, "").replace(withChildren, "");
}

// --- Phase 1: Remove entire nodes (and edges referencing them) ---

const removeNodePatterns = [
  /CDKMetadata/,
  /AWS[0-9a-f]{30,}/, // CDK custom resource Lambdas
  /CustomS3AutoDeleteObjects\w+/, // CDK S3 auto-delete provider
  /LogRetention[a-f0-9]{20,}/, // CDK log retention
  /CustomCDKBucketDeployment[A-F0-9]{20,}/, // CDK bucket deployment internals
  /AutoDeleteObjectsCustomResource/, // CDK auto-delete custom resources
  /DeploymentCustomResource\d+MiB/, // CDK BucketDeployment custom resources
  /DeploymentAwsCliLayer/, // CDK BucketDeployment CLI layers
  /ApiGwCleanup/, // API Gateway cleanup resources
  /ApiAccessLogsEnsureLogGroup/, // API access logs custom resource
  /ProviderframeworkonEvent/, // CDK provider framework internals
];

// Collect IDs of nodes to remove
const removedIds = new Set();
for (const pattern of removeNodePatterns) {
  const re = new RegExp(`id="([^"]*${pattern.source}[^"]*)"`, "g");
  let m;
  while ((m = re.exec(xml)) !== null) {
    removedIds.add(m[1]);
  }
  const re2 = new RegExp(`value="[^"]*${pattern.source}[^"]*"`, "g");
  while ((m = re2.exec(xml)) !== null) {
    const cellStart = xml.lastIndexOf("<mxCell", m.index);
    const idMatch = xml.substring(cellStart, m.index + m[0].length + 200).match(/id="([^"]+)"/);
    if (idMatch) removedIds.add(idMatch[1]);
  }
}

for (const id of removedIds) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  xml = removeCells(xml, `(?:id|source|target)="${escaped}"`);
}

// --- Phase 1.5: Remove env var edge labels before value cleaning ---
// Uppercase env var names: HMRC_CLIENT_SECRET_ARN, STRIPE_SECRET_KEY_ARN, etc.
xml = removeCells(xml, 'value="[A-Z_]+_ARN"');
// Lowercase variants
xml = removeCells(xml, 'value="[a-z_]+_arn"');

// Remove duplicate/wildcard secret nodes (trailing -*)
xml = removeCells(xml, 'value="Secret: [^"]*\\s"');

// Remove external infrastructure reference nodes (noise in most views)
const removeExternalPatterns = [
  /apigateway\s/, // API Gateway external ref
  /lambda\s[\w-]+\s\d+/, // Lambda provisioned concurrency ref
  /logs\s[\w-]+\s\d+/, // CloudWatch Logs external ref
  /iam\s/, // IAM role/policy external refs
];
for (const pattern of removeExternalPatterns) {
  xml = removeCells(xml, `value="${pattern.source}[^"]*"`);
}

// --- Phase 2: Clean value= attributes ---

const knownMappings = {
  httpapi: "HTTP API",
  customdomain: "Custom Domain",
  webdist: "CloudFront Distribution",
  originbucket: "Origin S3 Bucket",
  originbucketpolicy: "Origin Bucket Policy",
  webacl: "WAF WebACL",
  myoac: "Origin Access Control",
  ratelimitalarm: "Rate Limit Alarm",
  commonrulealarm: "Common Rule Alarm",
  badinputsalarm: "Bad Inputs Alarm",
  alerttopic: "Alert Topic",
  alerttopicpolicy: "Alert Topic Policy",
  apigwcleanup: "API GW Cleanup",
  apigwcleanupfn: "API GW Cleanup Lambda",
  api5xxalarm: "API 5xx Alarm",
  apialarm: "API Alarm",
  apicanary: "API Canary",
  healthcanary: "Health Canary",
  healthalarm: "Health Alarm",
  githubsyntheticalarm: "GitHub Synthetic Alarm",
  canaryrole: "Canary Role",
  canaryartifacts: "Canary Artifacts (S3)",
  canaryartifactspolicy: "Canary Artifacts Policy",
  cfnstackstatusrule: "CFN Stack Status Rule",
  httpapidefaultstage: "HTTP API Default Stage",
  apiaccesslogsensureloggroup: "API Access Logs (Log Group)",
  apigwcleanupproviderframeworkonevent: "API GW Cleanup Provider",
  apimapping: "API Mapping",
  aliasrecordaliasaaaaupsert: "DNS AAAA Record",
  aliasrecordaliasaupsert: "DNS A Record",
  fraudpreventionorp: "Origin Request Policy (Fraud)",
  testscp: "Security Content Policy (Test)",
  whp: "Response Headers Policy",
  alarmstatechangerule: "Alarm State Change Rule",
  activityemailproofrule: "Email Proof Rule",
  activitytelegramrule: "Telegram Rule",
  waitlist: "Waitlist (SNS)",
};

// Known domain words for dictionary splitting (fallback for all-lowercase segments)
const words = [
  "billing",
  "checkout",
  "portal",
  "recover",
  "webhook",
  "bundle",
  "capacity",
  "reconcile",
  "delete",
  "post",
  "get",
  "worker",
  "zero",
  "alias",
  "cognito",
  "token",
  "custom",
  "authorizer",
  "hmrc",
  "vat",
  "obligation",
  "return",
  "receipt",
  "interest",
  "pass",
  "admin",
  "generate",
  "my",
  "passes",
  "session",
  "beacon",
  "activity",
  "telegram",
  "forwarder",
  "alert",
  "topic",
  "policy",
  "canary",
  "artifacts",
  "health",
  "api",
  "http",
  "domain",
  "stage",
  "default",
  "mapping",
  "waitlist",
  "origin",
  "bucket",
  "web",
  "dist",
  "doc",
  "root",
  "deployment",
  "aws",
  "cli",
  "layer",
  "rate",
  "limit",
  "alarm",
  "common",
  "rule",
  "bad",
  "inputs",
  "cfn",
  "stack",
  "status",
  "self",
  "destruct",
  "queue",
  "dlq",
  "fn",
  "role",
  "service",
  "stripe",
  "secret",
  "key",
  "test",
  "price",
  "email",
  "proof",
  "state",
  "change",
  "access",
  "logs",
  "ensure",
  "log",
  "group",
  "errors",
  "throttles",
  "high",
  "duration",
  "metric",
  "filter",
  "record",
  "upsert",
  "response",
  "headers",
  "request",
  "prevention",
  "fraud",
  "control",
  "id",
  "name",
  "provider",
  "framework",
  "event",
  "on",
  "cleanup",
  "gw",
  "objects",
  "auto",
  "resource",
  "customer",
  "subscription",
  "subscriptions",
  "schedule",
  "destination",
  "github",
  "synthetic",
  "client",
  "sandbox",
  "bot",
].sort((a, b) => b.length - a.length); // Pre-sort: longest first for greedy match

function splitWithDictionary(segment) {
  let remaining = segment;
  const parts = [];
  while (remaining.length > 0) {
    let matched = false;
    for (const w of words) {
      if (remaining.startsWith(w)) {
        parts.push(w);
        remaining = remaining.substring(w.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Accumulate unmatched characters until a known word is found
      let unmatched = "";
      while (remaining.length > 0) {
        let found = false;
        for (const w of words) {
          if (remaining.startsWith(w)) {
            found = true;
            break;
          }
        }
        if (found) break;
        unmatched += remaining[0];
        remaining = remaining.substring(1);
      }
      parts.push(unmatched);
    }
  }
  return parts;
}

function splitConcatenated(name) {
  const input = name.replace(/_/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const segments = input.split("-");
  const result = [];
  for (const segment of segments) {
    if (segment.length === 0) continue;
    if (words.includes(segment)) {
      result.push(segment);
      continue;
    }
    result.push(...splitWithDictionary(segment));
  }
  return result.join("-").replace(/--+/g, "-");
}

function smartSplit(str) {
  // Hybrid: CamelCase splitting first, then dictionary for all-lowercase segments
  const camelParts = str
    .replace(/([a-z0-9])([A-Z])/g, "$1\x00$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1\x00$2")
    .split("\x00");

  const result = [];
  for (const part of camelParts) {
    const lower = part.toLowerCase();
    if (part === lower && part.length > 8) {
      // All-lowercase segment that's long — run dictionary splitting
      result.push(splitConcatenated(lower));
    } else {
      result.push(lower);
    }
  }
  return result.join("-").replace(/--+/g, "-");
}

function cleanExternalResource(val) {
  if (/cognito-idp/.test(val)) return "Cognito User Pool";
  if (/event-bus\//.test(val)) {
    const bus = val.match(/event-bus\/([\w-]+)/);
    return bus ? `EventBridge: ${bus[1]}` : "EventBridge Bus";
  }
  if (/secretsmanager/.test(val)) {
    const path = val.match(/&#xA;\s*([\w/._-]+)/);
    if (path) {
      const parts = path[1].replace(/\*$/, "").replace(/[-_]$/, "").split("/");
      const name = parts.slice(-1)[0].replace(/[-_]/g, " ");
      return `Secret: ${name}`;
    }
    return "Secret";
  }
  if (/apigateway[\s]/.test(val)) return "API Gateway";
  if (/lambda[\s].*&#xA;\s*pc/.test(val)) return "Lambda (provisioned)";
  if (/logs[\s].*&#xA;\s*\*/.test(val)) return "CloudWatch Logs";
  if (/acm[\s]/.test(val)) {
    const region = val.match(/acm\s+([\w-]+)/);
    return region ? `ACM Certificate (${region[1]})` : "ACM Certificate";
  }
  if (/cloudfront[\s]+\d+/.test(val)) return "CloudFront Distribution (external)";
  if (/route53/.test(val)) return "Route53 Hosted Zone";
  if (/iam[\s].*policy\//.test(val)) return "AWS Managed Policy";
  if (/iam[\s].*role\//.test(val)) {
    const role = val.match(/role\/([\w-]+)/);
    return role ? `IAM: ${role[1]}` : "IAM Role";
  }
  return null;
}

function cleanLabel(val) {
  let v = val;

  // Stack cross-reference labels
  if (/^prod-app-\w+Stack$/.test(v)) {
    return v.replace(/^prod-app-/, "").replace(/Stack$/, "");
  }

  // Strip prodapp prefix
  v = v.replace(/^prodapp/, "");

  // Strip CDK hash suffixes (exactly 8 uppercase hex chars, twice for double hashes)
  v = v.replace(/[A-F0-9]{8}$/, "");
  v = v.replace(/[A-F0-9]{8}$/, "");
  v = v.replace(/-+$/, "");

  // Check known mappings
  const stripped = v.toLowerCase().replace(/[-_]/g, "");
  if (knownMappings[stripped]) return knownMappings[stripped];

  const lower = v.toLowerCase();

  // SQS event source mapping — extract function name
  if (/zeroalias.*sqs.*event.*source/i.test(v)) {
    const fnPart = v.split(/[Zz]ero[Aa]lias/)[0];
    return smartSplit(fnPart).replace(/-fn$/, "") + " (SQS trigger)";
  }

  // EventBridge rules with allow-event suffixes
  if (/rule.*allow-event-rule/i.test(lower)) {
    return splitConcatenated(lower.split("-allow-event-rule")[0]) + " (permission)";
  }

  // Patterns to remove entirely (return null → kept as-is in callback, removed in Phase 3)
  if (/integration.*api/i.test(lower)) return null;
  if (/imported.*allow-invoke/i.test(lower)) return null;
  if (/allow-invoke-from-http-api/i.test(lower)) return null;
  if (/allow-invoke-authorizer/i.test(lower)) return null;

  // Lambda error alarm labels
  if (/lambda-errors-/.test(lower)) {
    const pathMatch = lower.match(/lambda-errors-(get|post|delete|head|put|patch)(.*)/);
    if (pathMatch) {
      return `Lambda Errors: ${pathMatch[1].toUpperCase()} ${pathMatch[2].replace(/api/, "/api/").replace(/v1/, "v1/")}`;
    }
  }

  // Smart split: CamelCase + dictionary fallback
  let result = smartSplit(v);

  // Strip internal 'prodapp' in construct names
  result = result.replace(/-?prodapp-?/g, "-").replace(/--+/g, "-");

  // Clean up suffixes
  result = result.replace(/-fn-service-role$/, " (role)");
  result = result.replace(/-fn-service$/, "");
  result = result.replace(/-fn$/, "");
  result = result.replace(/-(role)$/, " (role)");
  result = result.replace(/-dlq$/, " (DLQ)");
  result = result.replace(/-queue$/, " (Queue)");
  result = result.replace(/-schedule$/, " (Schedule)");

  // Known component patterns
  result = result.replace(/^waitlist.*/, "Waitlist (SNS)");

  return result.replace(/-+/g, "-").replace(/-+$/, "").replace(/^-+/, "");
}

// Process all value= attributes
xml = xml.replace(/value="([^"]+)"/g, (match, val) => {
  // Try external resource cleaning first (handles &#xA; values)
  const externalLabel = cleanExternalResource(val);
  if (externalLabel !== null) return `value="${externalLabel}"`;

  // Skip multi-line edge labels (CFN property names with newlines)
  if (val.includes("&#xA;")) return match;

  // Skip short values that look like edge labels, UNLESS they have CDK hash suffixes
  if (val.length < 20 && !/prodapp/i.test(val) && !/^prod-app-/.test(val) && !/[A-F0-9]{8}/.test(val)) return match;

  const cleaned = cleanLabel(val);
  if (cleaned === null) return match;
  if (cleaned === val) return match;
  return `value="${cleaned}"`;
});

// --- Phase 3: Remove nodes with specific value patterns ---
const removeValuePatterns = [
  /imported.*allow-invoke/i,
  /allow-invoke-from-http-api/i,
  /allow-invoke-authorizer/i,
  /integration-[a-z]+apiv1/i,
];

for (const pattern of removeValuePatterns) {
  xml = removeCells(xml, `value="[^"]*${pattern.source}[^"]*"`, "i");
  xml = removeCells(xml, `id="[^"]*${pattern.source}[^"]*"`, "i");
}

fs.writeFileSync(outputFile, xml);
console.log(`Cleaned ${inputFile} → ${outputFile}`);
