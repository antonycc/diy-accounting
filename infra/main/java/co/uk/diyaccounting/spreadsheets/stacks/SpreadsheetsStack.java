/*
 * SPDX-License-Identifier: AGPL-3.0-only
 * Copyright (C) 2025-2026 DIY Accounting Ltd
 */

package co.uk.diyaccounting.spreadsheets.stacks;

import static co.uk.diyaccounting.spreadsheets.utils.Kind.infof;
import static co.uk.diyaccounting.spreadsheets.utils.KindCdk.cfnOutput;
import static co.uk.diyaccounting.spreadsheets.utils.KindCdk.ensureLogGroupWithDependency;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.immutables.value.Value;
import software.amazon.awscdk.ArnComponents;
import software.amazon.awscdk.AssetHashType;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.Expiration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Size;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.Tags;
import software.amazon.awscdk.services.certificatemanager.Certificate;
import software.amazon.awscdk.services.cloudfront.AllowedMethods;
import software.amazon.awscdk.services.cloudfront.BehaviorOptions;
import software.amazon.awscdk.services.cloudfront.Distribution;
import software.amazon.awscdk.services.cloudfront.Function;
import software.amazon.awscdk.services.cloudfront.FunctionAssociation;
import software.amazon.awscdk.services.cloudfront.FunctionCode;
import software.amazon.awscdk.services.cloudfront.FunctionEventType;
import software.amazon.awscdk.services.cloudfront.FunctionRuntime;
import software.amazon.awscdk.services.cloudfront.HeadersFrameOption;
import software.amazon.awscdk.services.cloudfront.IOrigin;
import software.amazon.awscdk.services.cloudfront.OriginRequestPolicy;
import software.amazon.awscdk.services.cloudfront.ResponseCustomHeader;
import software.amazon.awscdk.services.cloudfront.ResponseCustomHeadersBehavior;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersContentSecurityPolicy;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersContentTypeOptions;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersCorsBehavior;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersFrameOptions;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersPolicy;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersReferrerPolicy;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersStrictTransportSecurity;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersXSSProtection;
import software.amazon.awscdk.services.cloudfront.ResponseSecurityHeadersBehavior;
import software.amazon.awscdk.services.cloudfront.S3OriginAccessControl;
import software.amazon.awscdk.services.cloudfront.SSLMethod;
import software.amazon.awscdk.services.cloudfront.Signing;
import software.amazon.awscdk.services.cloudfront.ViewerProtocolPolicy;
import software.amazon.awscdk.services.cloudfront.origins.S3BucketOrigin;
import software.amazon.awscdk.services.cloudfront.origins.S3BucketOriginWithOACProps;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.amazon.awscdk.services.logs.CfnDelivery;
import software.amazon.awscdk.services.logs.CfnDeliveryDestination;
import software.amazon.awscdk.services.logs.CfnDeliveryDestinationProps;
import software.amazon.awscdk.services.logs.CfnDeliveryProps;
import software.amazon.awscdk.services.logs.CfnDeliverySource;
import software.amazon.awscdk.services.logs.CfnDeliverySourceProps;
import software.amazon.awscdk.services.logs.ILogGroup;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketEncryption;
import software.amazon.awscdk.services.s3.assets.AssetOptions;
import software.amazon.awscdk.services.s3.deployment.BucketDeployment;
import software.amazon.awscdk.services.s3.deployment.Source;
import software.constructs.Construct;

/**
 * SpreadsheetsStack: S3 + CloudFront for the spreadsheets.diyaccounting.co.uk static site.
 * <p>
 * Modelled on GatewayStack with the same pattern:
 * - No Route53 records (those live in root account, managed by root.diyaccounting.co.uk repo)
 * - No Lambda function URL integration
 * - Simple CSP for static site with PayPal Donate SDK
 * - Cert referenced by ARN, not created by CDK (cross-account zone problem)
 * - Optional CloudFront Function for URL redirects (generated from redirects.toml)
 */
public class SpreadsheetsStack extends Stack {

    public final Bucket originBucket;
    public final Distribution distribution;
    public final BucketDeployment webDeployment;

    @Value.Immutable
    public interface SpreadsheetsStackProps extends StackProps {
        @Override
        Environment getEnv();

        @Override
        @Value.Default
        default Boolean getCrossRegionReferences() {
            return false;
        }

        String envName();

        String certificateArn();

        String docRootPath();

        /** Domain names for the CloudFront distribution (e.g. ci-spreadsheets.diyaccounting.co.uk) */
        List<String> domainNames();

        static ImmutableSpreadsheetsStackProps.Builder builder() {
            return ImmutableSpreadsheetsStackProps.builder();
        }
    }

    public SpreadsheetsStack(final Construct scope, final String id, final SpreadsheetsStackProps props) {
        super(scope, id, StackProps.builder().env(props.getEnv()).build());

        String resourcePrefix = props.envName() + "-spreadsheets";

        // Apply cost allocation tags
        Tags.of(this).add("Environment", props.envName());
        Tags.of(this).add("Application", "@antonycc/diy-accounting/spreadsheets");
        Tags.of(this).add("CostCenter", "@antonycc/diy-accounting");
        Tags.of(this).add("Owner", "@antonycc/diy-accounting");
        Tags.of(this).add("Project", "@antonycc/diy-accounting");
        Tags.of(this).add("Stack", "SpreadsheetsStack");
        Tags.of(this).add("ManagedBy", "aws-cdk");
        Tags.of(this).add("BillingPurpose", "spreadsheets-static-site");
        Tags.of(this).add("ResourceType", "static-site");
        Tags.of(this).add("Criticality", "low");
        Tags.of(this).add("DataClassification", "public");
        Tags.of(this).add("BackupRequired", "false");
        Tags.of(this).add("MonitoringEnabled", "true");

        // TLS certificate from existing ACM (must be in us-east-1 for CloudFront)
        var cert = Certificate.fromCertificateArn(this, resourcePrefix + "-WebCert", props.certificateArn());

        // S3 origin bucket — no explicit bucketName so each account gets a unique name
        // (S3 bucket names are globally unique; hardcoding causes collisions during account migration)
        this.originBucket = Bucket.Builder.create(this, resourcePrefix + "-OriginBucket")
                .versioned(false)
                .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
                .encryption(BucketEncryption.S3_MANAGED)
                .removalPolicy(RemovalPolicy.DESTROY)
                .autoDeleteObjects(true)
                .build();
        infof("Created origin bucket %s", this.originBucket.getBucketName());

        this.originBucket.addToResourcePolicy(PolicyStatement.Builder.create()
                .sid("AllowCloudFrontReadViaOAC")
                .principals(List.of(new ServicePrincipal("cloudfront.amazonaws.com")))
                .actions(List.of("s3:GetObject"))
                .resources(List.of(this.originBucket.getBucketArn() + "/*"))
                .conditions(Map.of(
                        "StringEquals",
                        Map.of("AWS:SourceAccount", this.getAccount()),
                        "ArnLike",
                        Map.of("AWS:SourceArn", "arn:aws:cloudfront::" + this.getAccount() + ":distribution/*")))
                .build());

        S3OriginAccessControl oac = S3OriginAccessControl.Builder.create(this, resourcePrefix + "-OAC")
                .signing(Signing.SIGV4_ALWAYS)
                .build();
        IOrigin origin = S3BucketOrigin.withOriginAccessControl(
                this.originBucket,
                S3BucketOriginWithOACProps.builder().originAccessControl(oac).build());

        // Response headers policy: CSP allows PayPal Donate SDK and self
        ResponseHeadersPolicy responseHeadersPolicy = ResponseHeadersPolicy.Builder.create(
                        this, resourcePrefix + "-HeadersPolicy")
                .responseHeadersPolicyName(resourcePrefix + "-headers")
                .comment("Security headers for spreadsheets static site")
                .corsBehavior(ResponseHeadersCorsBehavior.builder()
                        .accessControlAllowCredentials(false)
                        .accessControlAllowHeaders(List.of("*"))
                        .accessControlAllowMethods(List.of("GET", "HEAD", "OPTIONS"))
                        .accessControlAllowOrigins(List.of("*"))
                        .accessControlExposeHeaders(List.of())
                        .accessControlMaxAge(Duration.seconds(600))
                        .originOverride(true)
                        .build())
                .securityHeadersBehavior(ResponseSecurityHeadersBehavior.builder()
                        .contentSecurityPolicy(ResponseHeadersContentSecurityPolicy.builder()
                                .contentSecurityPolicy("default-src 'self'; "
                                        + "script-src 'self' 'unsafe-inline' https://www.paypalobjects.com https://www.googletagmanager.com; "
                                        + "style-src 'self' 'unsafe-inline'; "
                                        + "img-src 'self' data: https://www.paypalobjects.com https://www.google-analytics.com https://www.googletagmanager.com https://avatars.githubusercontent.com; "
                                        + "font-src 'self'; "
                                        + "connect-src 'self' https://www.paypal.com https://www.paypalobjects.com https://*.google-analytics.com https://www.googletagmanager.com https://api.github.com; "
                                        + "frame-src https://www.paypal.com; "
                                        + "frame-ancestors 'none'; "
                                        + "form-action 'self' https://www.paypal.com;")
                                .override(true)
                                .build())
                        .strictTransportSecurity(ResponseHeadersStrictTransportSecurity.builder()
                                .accessControlMaxAge(Duration.days(365))
                                .includeSubdomains(true)
                                .override(true)
                                .build())
                        .contentTypeOptions(ResponseHeadersContentTypeOptions.builder()
                                .override(true)
                                .build())
                        .frameOptions(ResponseHeadersFrameOptions.builder()
                                .frameOption(HeadersFrameOption.DENY)
                                .override(true)
                                .build())
                        .referrerPolicy(ResponseHeadersReferrerPolicy.builder()
                                .referrerPolicy(
                                        software.amazon.awscdk.services.cloudfront.HeadersReferrerPolicy
                                                .STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                                .override(true)
                                .build())
                        .xssProtection(ResponseHeadersXSSProtection.builder()
                                .protection(true)
                                .modeBlock(true)
                                .override(true)
                                .build())
                        .build())
                .customHeadersBehavior(ResponseCustomHeadersBehavior.builder()
                        .customHeaders(List.of(
                                ResponseCustomHeader.builder()
                                        .header("Cross-Origin-Opener-Policy")
                                        .value("same-origin")
                                        .override(true)
                                        .build(),
                                ResponseCustomHeader.builder()
                                        .header("Cross-Origin-Embedder-Policy")
                                        .value("unsafe-none")
                                        .override(true)
                                        .build(),
                                ResponseCustomHeader.builder()
                                        .header("Cross-Origin-Resource-Policy")
                                        .value("same-origin")
                                        .override(true)
                                        .build(),
                                ResponseCustomHeader.builder()
                                        .header("Server")
                                        .value("DIY-Accounting")
                                        .override(true)
                                        .build()))
                        .build())
                .build();

        // CloudFront Function for URL redirects (old www URLs → new sites)
        // Generated by scripts/build-spreadsheets-redirects.cjs from redirects.toml
        var publicDir = Paths.get(props.docRootPath()).toAbsolutePath().normalize();
        var redirectFunctionPath = publicDir.getParent().resolve("redirect-function.js");
        List<FunctionAssociation> functionAssociations = new ArrayList<>();
        if (Files.exists(redirectFunctionPath)) {
            try {
                var code = Files.readString(redirectFunctionPath);
                var redirectFunction = Function.Builder.create(this, resourcePrefix + "-RedirectFunction")
                        .functionName(resourcePrefix + "-redirects")
                        .code(FunctionCode.fromInline(code))
                        .runtime(FunctionRuntime.JS_2_0)
                        .comment("301 redirects for old spreadsheets.diyaccounting.co.uk URLs")
                        .build();
                functionAssociations.add(FunctionAssociation.builder()
                        .function(redirectFunction)
                        .eventType(FunctionEventType.VIEWER_REQUEST)
                        .build());
                infof("Attached redirect CloudFront Function from %s", redirectFunctionPath);
            } catch (Exception e) {
                infof("Warning: could not read redirect function: %s", e.getMessage());
            }
        } else {
            infof("No redirect function found at %s, skipping", redirectFunctionPath);
        }

        BehaviorOptions defaultBehavior = BehaviorOptions.builder()
                .origin(origin)
                .allowedMethods(AllowedMethods.ALLOW_GET_HEAD_OPTIONS)
                .originRequestPolicy(OriginRequestPolicy.CORS_S3_ORIGIN)
                .viewerProtocolPolicy(ViewerProtocolPolicy.REDIRECT_TO_HTTPS)
                .responseHeadersPolicy(responseHeadersPolicy)
                .functionAssociations(functionAssociations)
                .compress(true)
                .build();

        // CloudWatch log group for access logs
        String logGroupName = "distribution-" + resourcePrefix + "-logs";
        ILogGroup accessLogGroup = ensureLogGroupWithDependency(this, resourcePrefix + "-AccessLogGroup", logGroupName)
                .logGroup();

        // CloudFront distribution
        this.distribution = Distribution.Builder.create(this, resourcePrefix + "-Distribution")
                .defaultBehavior(defaultBehavior)
                .domainNames(props.domainNames())
                .certificate(cert)
                .defaultRootObject("index.html")
                .enableLogging(false) // legacy S3 logging off
                .enableIpv6(true)
                .sslSupportMethod(SSLMethod.SNI)
                .build();

        // CloudFront access logging to CloudWatch Logs
        String distributionArn = Stack.of(this)
                .formatArn(ArnComponents.builder()
                        .service("cloudfront")
                        .region("")
                        .resource("distribution")
                        .resourceName(this.distribution.getDistributionId())
                        .build());

        String deliverySourceName = resourcePrefix + "-dist-logs-src";
        String deliveryDestName = resourcePrefix + "-logs-dest";

        CfnDeliveryDestination logsDestination = new CfnDeliveryDestination(
                this,
                resourcePrefix + "-LogsDestination",
                CfnDeliveryDestinationProps.builder()
                        .name(deliveryDestName)
                        .destinationResourceArn(accessLogGroup.getLogGroupArn())
                        .outputFormat("json")
                        .build());

        CfnDeliverySource logsSource = new CfnDeliverySource(
                this,
                resourcePrefix + "-LogsSource",
                CfnDeliverySourceProps.builder()
                        .name(deliverySourceName)
                        .logType("ACCESS_LOGS")
                        .resourceArn(distributionArn)
                        .build());

        CfnDelivery logsDelivery = new CfnDelivery(
                this,
                resourcePrefix + "-LogsDelivery",
                CfnDeliveryProps.builder()
                        .deliverySourceName(deliverySourceName)
                        .deliveryDestinationArn(logsDestination.getAttrArn())
                        .build());
        logsDelivery.addDependency(logsSource);

        // Deploy static site files to S3 and invalidate distribution
        infof("Using spreadsheets doc root: %s".formatted(publicDir));
        var webDocRootSource = Source.asset(
                publicDir.toString(),
                AssetOptions.builder().assetHashType(AssetHashType.SOURCE).build());
        this.webDeployment = BucketDeployment.Builder.create(this, resourcePrefix + "-DeployWebContent")
                .sources(List.of(webDocRootSource))
                .destinationBucket(this.originBucket)
                .distribution(distribution)
                .distributionPaths(List.of(
                        "/index.html",
                        "/download.html",
                        "/donate.html",
                        "/knowledge-base.html",
                        "/all-articles.html",
                        "/references.html",
                        "/sources.html",
                        "/recently-updated.html",
                        "/community.html",
                        "/recently-updated.toml",
                        "/knowledge-base.toml",
                        "/references.toml",
                        "/catalogue.toml",
                        "/spreadsheets.css",
                        "/lib/*",
                        "/articles/*",
                        "/robots.txt",
                        "/sitemap.xml",
                        "/favicon.svg",
                        "/favicon.ico"))
                .retainOnDelete(true)
                .expires(Expiration.after(Duration.minutes(5)))
                .prune(false)
                .memoryLimit(1024)
                .ephemeralStorageSize(Size.gibibytes(2))
                .build();

        // Outputs
        cfnOutput(this, "DistributionDomainName", this.distribution.getDomainName());
        cfnOutput(this, "DistributionId", this.distribution.getDistributionId());
        cfnOutput(this, "OriginBucketName", this.originBucket.getBucketName());

        infof("SpreadsheetsStack %s created for %s", this.getNode().getId(), String.join(", ", props.domainNames()));
    }
}
