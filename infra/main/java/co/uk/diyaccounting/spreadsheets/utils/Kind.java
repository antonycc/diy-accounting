/*
 * SPDX-License-Identifier: AGPL-3.0-only
 * Copyright (C) 2026 DIY Accounting Ltd
 */

package co.uk.diyaccounting.spreadsheets.utils;

import java.util.Map;
import java.util.Optional;

public final class Kind {
    private Kind() {}

    public static void logf(String fmt, Object... args) {
        System.out.printf(fmt + "%n", args);
    }

    public static void infof(String fmt, Object... args) {
        logf("[INFO] " + fmt, args);
    }

    public static void warnf(String fmt, Object... args) {
        logf("[WARN] " + fmt, args);
    }

    // Safe putIfNotNull
    public static <K, V> void putIfNotNull(Map<K, V> map, K key, V value) {
        if (value != null) {
            map.put(key, value);
            infof("Put key %s with value %s", key, value);
        } else {
            infof("Did not put key %s with null/empty value %s", key, value);
        }
    }

    public static <K, V> void putIfPresent(Map<K, V> map, K key, Optional<? extends V> value) {
        if (value != null && value.isPresent()) {
            map.put(key, value.get());
            infof("Put key %s with value %s", key, value);
        } else {
            infof("Did not put key %s with null/empty value %s", key, value);
        }
    }

    public static String envOr(String environmentVariable, String alternativeValue) {
        return envOr(environmentVariable, alternativeValue, "");
    }

    public static String envOr(String environmentVariable, String alternativeValue, String alternativeSource) {
        String environmentValue = System.getenv(environmentVariable);
        if (environmentValue != null && !environmentValue.isBlank()) {
            infof("Using environment variable %s for value %s", environmentVariable, environmentValue);
            return environmentValue;
        } else {
            var sourceLabel = alternativeSource == null ? "" : " " + alternativeSource;
            infof(
                    "Using environment variable %s is null or blank using alternative%s, value %s",
                    environmentVariable, sourceLabel, environmentValue);
            return alternativeValue;
        }
    }
}
