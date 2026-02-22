#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 DIY Accounting Ltd
#
# Update Java/Maven dependencies to latest versions
#
# Usage: ./scripts/update-java.sh

set -euo pipefail

# remove Maven's build outputs and cached resolution
rm -rf target
rm -rf cdk-spreadsheets.out
rm -rf ~/.m2/repository/

# clean + resolve dependencies fresh
./mvnw clean
./mvnw versions:display-dependency-updates

# update to latest versions allowed by your pom
./mvnw versions:use-latest-releases -DprocessPlugins=true -DprocessDependencies=false -DprocessParent=false -DallowMajorUpdates=true -DgenerateBackupPoms=false
./mvnw versions:use-latest-releases -DprocessPlugins=false -DprocessDependencies=true -DprocessParent=false -DallowMajorUpdates=true -DgenerateBackupPoms=false
./mvnw versions:use-latest-releases -DprocessPlugins=false -DprocessDependencies=false -DprocessParent=true -DallowMajorUpdates=true -DgenerateBackupPoms=false

# update transitive dependencies
./mvnw versions:use-latest-releases -DgenerateBackupPoms=false

# install dependencies freshly
./mvnw dependency:resolve

# build the project
./mvnw install

# display any remaining updates
./mvnw versions:display-dependency-updates -DincludeSnapshots=false | grep -Ev 'alpha|beta|rc|cr|M[0-9]+' || true
