package com.tensquad.safeguard.ui

import android.app.Activity
import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.view.View
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.LinearLayout
import android.net.VpnService
import android.os.Bundle
import android.provider.Settings
import android.text.format.DateFormat
import android.widget.Toast
import com.tensquad.safeguard.R
import com.tensquad.safeguard.SafeGuardAccessibilityService
import com.tensquad.safeguard.data.BlocklistRepository
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.databinding.ActivityMainBinding
import com.tensquad.safeguard.receiver.SafeGuardDeviceAdminReceiver
import com.tensquad.safeguard.vpn.SafeGuardVpnService
import java.util.Date
import kotlin.concurrent.thread

class MainActivity : Activity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: PrefsManager
    private lateinit var blocklist: BlocklistRepository

    /** Guards Switch.setChecked() calls that shouldn't re-trigger the listener. */
    private var suppressToggleCallback = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PrefsManager(applicationContext)
        blocklist = BlocklistRepository(applicationContext)

        binding.updateBlocklistButton.setOnClickListener { updateBlocklist() }
        binding.changePinButton.setOnClickListener { requireOrChangePin() }
        binding.setupParentsButton.setOnClickListener {
            startActivity(Intent(this, SetupParentsActivity::class.java))
        }
        binding.lockVpnButton.setOnClickListener { promptManualVpnLockdown() }
        binding.enableDeviceAdminButton.setOnClickListener { promptDeviceAdminIfNeeded(showIfAlreadyActive = true) }
        binding.accessibilityButton.setOnClickListener { openAccessibilitySettings() }
        binding.protectedAppsButton.setOnClickListener { chooseProtectedApps() }
        binding.protectionSwitch.setOnCheckedChangeListener { _, isChecked ->
            if (suppressToggleCallback) return@setOnCheckedChangeListener
            if (isChecked) onEnableRequested() else onDisableRequested()
        }

        if (!prefs.hasPin()) {
            startActivityForResult(Intent(this, SetPinActivity::class.java), REQUEST_INITIAL_PIN)
        }

        thread {
            blocklist.loadIntoMemory()
            runOnUiThread { refreshBlocklistInfo() }
        }
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
        refreshBlocklistInfo()
    }

    private fun onEnableRequested() {
        if (!prefs.hasPin()) {
            startActivityForResult(Intent(this, SetPinActivity::class.java), REQUEST_INITIAL_PIN)
            return
        }
        val vpnConsent = VpnService.prepare(this)
        if (vpnConsent != null) {
            startActivityForResult(vpnConsent, REQUEST_VPN_PERMISSION)
        } else {
            startProtection()
        }
    }

    private fun onDisableRequested() {
        // Revert the visual toggle until approval is confirmed.
        setSwitchChecked(true)
        if (prefs.isParentApprovalConfigured()) {
            startActivityForResult(Intent(this, ParentApprovalActivity::class.java), REQUEST_DISABLE_APPROVAL)
        } else {
            startActivityForResult(Intent(this, PinLockActivity::class.java), REQUEST_DISABLE_PIN)
        }
    }

    private fun startProtection() {
        val intent = Intent(this, SafeGuardVpnService::class.java)
        startForegroundService(intent)
        setSwitchChecked(true)
        refreshStatus()
        warnIfPrivateDnsEnabled()
        blockUninstallIfDeviceOwner()
        lockDownVpnIfDeviceOwner()
    }

    /**
     * Only takes effect if this device was provisioned as Device Owner (see
     * README "Device Owner setup") -- a no-op otherwise, since plain Device
     * Admin has no API to actually block uninstall. When it does apply, the
     * only way back is through ParentApprovalActivity's matching call.
     */
    private fun blockUninstallIfDeviceOwner() {
        try {
            val dpm = getSystemService(DevicePolicyManager::class.java)
            val admin = ComponentName(this, SafeGuardDeviceAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setUninstallBlocked(admin, packageName, true)
            }
        } catch (e: Exception) {
            // Not a device owner, or policy call failed -- Device Admin friction still applies.
        }
    }

    /**
     * Only takes effect if this device is Device Owner. Marks SafeGuard as
     * the device's always-on VPN with lockdown enabled: Android then (a)
     * refuses to let any other app establish a competing VPN connection
     * while this one is set, and (b) blocks all network traffic device-wide
     * if this VPN ever drops, instead of silently falling back to
     * unfiltered internet. Closes the "just open a different VPN app" gap.
     * Without Device Owner, the same protection can still be turned on
     * manually -- see promptManualVpnLockdown() / README.
     */
    private fun lockDownVpnIfDeviceOwner() {
        try {
            val dpm = getSystemService(DevicePolicyManager::class.java)
            val admin = ComponentName(this, SafeGuardDeviceAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setAlwaysOnVpnPackage(admin, packageName, true)
            }
        } catch (e: Exception) {
            // Not a device owner, or policy call failed -- manual Settings toggle still available.
        }
    }

    /**
     * Manual equivalent of lockDownVpnIfDeviceOwner() for phones that
     * aren't Device Owner-provisioned: walks the parent to Android's own
     * VPN settings screen to turn "Always-on VPN" + "Block connections
     * without VPN" on for SafeGuard by hand, a one-time step.
     */
    private fun promptManualVpnLockdown() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.lockdown_dialog_title))
            .setMessage(getString(R.string.lockdown_dialog_message))
            .setPositiveButton(getString(R.string.btn_open_vpn_settings)) { _, _ ->
                try {
                    startActivity(Intent(Settings.ACTION_VPN_SETTINGS))
                } catch (e: Exception) {
                    Toast.makeText(this, "Settings > Network & Internet > VPN me jaakar karein", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Baad me", null)
            .show()
    }

    /**
     * "Private DNS" (DNS-over-TLS) sends lookups over an encrypted channel
     * this VPN cannot inspect -- a real OS-level limit on any non-root DNS
     * filter, not specific to this app. If it's on, nudge the user to turn
     * it off so filtering actually takes effect.
     */
    private fun warnIfPrivateDnsEnabled() {
        val mode = try {
            Settings.Global.getString(contentResolver, "private_dns_mode")
        } catch (e: Exception) {
            null
        }
        if (mode.isNullOrEmpty() || mode == "off") return

        AlertDialog.Builder(this)
            .setTitle("Private DNS is ON")
            .setMessage(
                "Aapke phone ki 'Private DNS' setting on hai. Isse blocking kaam nahi karegi, " +
                    "kyunki DNS requests ek encrypted channel se jaati hain jise koi bhi non-root " +
                    "app dekh nahi sakta. Settings > Wi-Fi & Network > Private DNS me jaakar ise " +
                    "'Off' kar dein, phir wapas aakar protection switch ek baar off/on karein."
            )
            .setPositiveButton("Settings kholo") { _, _ ->
                try {
                    startActivity(Intent(Settings.ACTION_WIRELESS_SETTINGS))
                } catch (e: Exception) {
                    Toast.makeText(this, "Settings > Wi-Fi & Network > Private DNS me jaakar off karein", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Baad me", null)
            .show()
    }

    private fun stopProtection() {
        val intent = Intent(this, SafeGuardVpnService::class.java).apply {
            action = SafeGuardVpnService.ACTION_STOP
        }
        startService(intent)
        setSwitchChecked(false)
        refreshStatus()
    }

    private fun requireOrChangePin() {
        if (!prefs.hasPin()) {
            startActivityForResult(Intent(this, SetPinActivity::class.java), REQUEST_INITIAL_PIN)
        } else {
            startActivityForResult(Intent(this, PinLockActivity::class.java), REQUEST_CHANGE_PIN_UNLOCK)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQUEST_INITIAL_PIN -> {
                if (resultCode == RESULT_OK) promptDeviceAdminIfNeeded(showIfAlreadyActive = false)
                // Either way, reflect current state; user can retry via the switch.
            }
            REQUEST_VPN_PERMISSION -> {
                if (resultCode == RESULT_OK) startProtection() else setSwitchChecked(false)
            }
            REQUEST_DISABLE_PIN, REQUEST_DISABLE_APPROVAL -> {
                if (resultCode == RESULT_OK) stopProtection() else setSwitchChecked(true)
            }
            REQUEST_CHANGE_PIN_UNLOCK -> {
                if (resultCode == RESULT_OK) {
                    startActivityForResult(Intent(this, SetPinActivity::class.java), REQUEST_INITIAL_PIN)
                }
            }
        }
    }

    private fun openAccessibilitySettings() {
        try {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        } catch (e: Exception) {
            Toast.makeText(this, "Accessibility settings nahi khul sake", Toast.LENGTH_LONG).show()
        }
    }

    private fun chooseProtectedApps() {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val admin = ComponentName(this, SafeGuardDeviceAdminReceiver::class.java)
        if (!dpm.isDeviceOwnerApp(packageName)) {
            AlertDialog.Builder(this)
                .setTitle(getString(R.string.protected_apps_title))
                .setMessage(getString(R.string.protected_apps_device_owner_note) + "\n\nPehle SafeGuard ko Device Owner ke roop me provision karein.")
                .setPositiveButton("OK", null).show()
            return
        }

        val pm = packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { it.packageName != packageName && pm.getLaunchIntentForPackage(it.packageName) != null }
            .sortedBy { pm.getApplicationLabel(it).toString().lowercase() }

        val protected = prefs.getProtectedPackages().toMutableSet()
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 8, 32, 8)
        }
        val checks = mutableMapOf<String, CheckBox>()
        apps.forEach { app ->
            val cb = CheckBox(this).apply {
                text = pm.getApplicationLabel(app)
                isChecked = protected.contains(app.packageName)
                contentDescription = app.packageName
            }
            checks[app.packageName] = cb
            container.addView(cb)
        }
        val scroll = android.widget.ScrollView(this).apply { addView(container) }
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.protected_apps_title))
            .setView(scroll)
            .setPositiveButton("Save") { _, _ ->
                val selected = checks.filterValues { it.isChecked }.keys.toSet()
                prefs.setProtectedPackages(selected)
                // Apply the policy only to the selected packages.
                apps.forEach { app ->
                    try { dpm.setUninstallBlocked(admin, app.packageName, selected.contains(app.packageName)) } catch (_: SecurityException) { }
                }
                Toast.makeText(this, "Protected apps updated", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    /** Optional extra friction against uninstalling the app -- see SafeGuardDeviceAdminReceiver doc. */
    private fun promptDeviceAdminIfNeeded(showIfAlreadyActive: Boolean) {
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val adminComponent = ComponentName(this, SafeGuardDeviceAdminReceiver::class.java)
        if (dpm.isAdminActive(adminComponent)) {
            if (showIfAlreadyActive) {
                Toast.makeText(this, "Device Admin already ON hai — uninstall protection active hai.", Toast.LENGTH_LONG).show()
            }
            return
        }

        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                getString(R.string.device_admin_description)
            )
        }
        try {
            startActivity(intent)
        } catch (e: Exception) {
            // Device admin isn't available on this build; PIN gate alone still applies.
        }
    }

    private fun updateBlocklist() {
        binding.updateBlocklistButton.isEnabled = false
        thread {
            val result = blocklist.updateFromRemote()
            runOnUiThread {
                binding.updateBlocklistButton.isEnabled = true
                if (result.isSuccess) {
                    prefs.lastBlocklistUpdate = System.currentTimeMillis()
                    Toast.makeText(this, "Blocklist updated (${result.getOrNull()} domains)", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Update failed: ${result.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                }
                refreshBlocklistInfo()
            }
        }
    }

    private fun refreshStatus() {
        val enabled = prefs.protectionEnabled
        setSwitchChecked(enabled)
        binding.statusText.text = getString(if (enabled) R.string.status_protected else R.string.status_unprotected)
        binding.statusText.setTextColor(
            resources.getColor(if (enabled) R.color.accent_on else R.color.accent_off, theme)
        )

        val accessibilityOn = isAccessibilityServiceEnabled()
        binding.accessibilityButton.text = getString(R.string.btn_accessibility) +
            if (accessibilityOn) " ✅ ON" else " ⚠️ OFF"
    }

    /**
     * Reads the OS's own accessibility-services list rather than trusting a
     * remembered flag, since the toggle is reset by Android on every
     * install/update and can be silently switched off by the user at any
     * time -- this is the only source of truth for whether
     * SafeGuardAccessibilityService (and therefore the Device Admin
     * deactivation bounce) is actually running right now.
     */
    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedComponent = ComponentName(this, SafeGuardAccessibilityService::class.java).flattenToString()
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.split(':').any { it.equals(expectedComponent, ignoreCase = true) }
    }

    private fun refreshBlocklistInfo() {
        binding.blocklistCountText.text = getString(R.string.blocklist_count_prefix, blocklist.size)
        val lastUpdate = prefs.lastBlocklistUpdate
        val text = if (lastUpdate == 0L) "never" else DateFormat.format("dd MMM yyyy, HH:mm", Date(lastUpdate)).toString()
        binding.lastUpdatedText.text = getString(R.string.last_updated_prefix, text)
    }

    private fun setSwitchChecked(checked: Boolean) {
        suppressToggleCallback = true
        binding.protectionSwitch.isChecked = checked
        suppressToggleCallback = false
    }

    companion object {
        private const val REQUEST_INITIAL_PIN = 100
        private const val REQUEST_VPN_PERMISSION = 101
        private const val REQUEST_DISABLE_PIN = 102
        private const val REQUEST_CHANGE_PIN_UNLOCK = 103
        private const val REQUEST_DISABLE_APPROVAL = 104
    }
}
