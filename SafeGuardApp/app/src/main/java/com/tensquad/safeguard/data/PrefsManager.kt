package com.tensquad.safeguard.data

import android.content.Context
import android.content.SharedPreferences
import java.security.MessageDigest

/**
 * Wraps SharedPreferences for all app settings: protection state, parent PIN
 * (stored only as a salted hash, never plaintext), and blocklist metadata.
 */
class PrefsManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var protectionEnabled: Boolean
        get() = prefs.getBoolean(KEY_PROTECTION_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_PROTECTION_ENABLED, value).apply()

    var lastBlocklistUpdate: Long
        get() = prefs.getLong(KEY_LAST_UPDATE, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_UPDATE, value).apply()

    fun hasPin(): Boolean = prefs.contains(KEY_PIN_HASH)

    fun setPin(pin: String) {
        prefs.edit().putString(KEY_PIN_HASH, hash(pin)).apply()
    }

    fun verifyPin(pin: String): Boolean {
        val stored = prefs.getString(KEY_PIN_HASH, null) ?: return false
        return stored == hash(pin)
    }

    // --- Parent approval (2-of-2): phone numbers for SMS OTP + paired Bluetooth MACs for proximity check ---

    var parentPhone1: String?
        get() = prefs.getString(KEY_PARENT_PHONE_1, null)
        set(value) = prefs.edit().putString(KEY_PARENT_PHONE_1, value).apply()

    var parentPhone2: String?
        get() = prefs.getString(KEY_PARENT_PHONE_2, null)
        set(value) = prefs.edit().putString(KEY_PARENT_PHONE_2, value).apply()

    var parentDevice1Address: String?
        get() = prefs.getString(KEY_PARENT_DEVICE_1, null)
        set(value) = prefs.edit().putString(KEY_PARENT_DEVICE_1, value).apply()

    var parentDevice2Address: String?
        get() = prefs.getString(KEY_PARENT_DEVICE_2, null)
        set(value) = prefs.edit().putString(KEY_PARENT_DEVICE_2, value).apply()

    fun getProtectedPackages(): Set<String> =
        prefs.getStringSet(KEY_PROTECTED_PACKAGES, emptySet()) ?: emptySet()

    fun setProtectedPackages(packages: Set<String>) {
        prefs.edit().putStringSet(KEY_PROTECTED_PACKAGES, packages.toSet()).apply()
    }

    fun isParentApprovalConfigured(): Boolean =
        !parentPhone1.isNullOrBlank() && !parentPhone2.isNullOrBlank() &&
            !parentDevice1Address.isNullOrBlank() && !parentDevice2Address.isNullOrBlank()

    private fun hash(pin: String): String {
        val salted = "$PIN_SALT:$pin"
        val digest = MessageDigest.getInstance("SHA-256").digest(salted.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val PREFS_NAME = "safeguard_prefs"
        private const val KEY_PROTECTION_ENABLED = "protection_enabled"
        private const val KEY_LAST_UPDATE = "last_blocklist_update"
        private const val KEY_PIN_HASH = "pin_hash"
        private const val KEY_PARENT_PHONE_1 = "parent_phone_1"
        private const val KEY_PARENT_PHONE_2 = "parent_phone_2"
        private const val KEY_PARENT_DEVICE_1 = "parent_device_1"
        private const val KEY_PARENT_DEVICE_2 = "parent_device_2"
        private const val KEY_PROTECTED_PACKAGES = "protected_packages"
        // App-specific constant, not a secret by itself — the PIN itself provides the entropy.
        private const val PIN_SALT = "com.tensquad.safeguard.pin"
    }
}
