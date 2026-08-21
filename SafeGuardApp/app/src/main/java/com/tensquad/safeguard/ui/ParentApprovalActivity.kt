package com.tensquad.safeguard.ui

import android.Manifest
import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.tensquad.safeguard.R
import com.tensquad.safeguard.bluetooth.ParentProximityScanner
import com.tensquad.safeguard.data.OtpManager
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.databinding.ActivityParentApprovalBinding
import com.tensquad.safeguard.receiver.SafeGuardDeviceAdminReceiver

/**
 * Gatekeeper for disabling protection / unlocking uninstall: both saved
 * parent phones must be found nearby over Bluetooth, then both must supply
 * the SMS OTP sent to their own number. Only on a full match does this
 * finish with RESULT_OK.
 */
class ParentApprovalActivity : Activity() {

    private lateinit var binding: ActivityParentApprovalBinding
    private lateinit var prefs: PrefsManager
    private lateinit var scanner: ParentProximityScanner
    private val otpManager = OtpManager()

    private var parent1Found = false
    private var parent2Found = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityParentApprovalBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PrefsManager(applicationContext)
        scanner = ParentProximityScanner(applicationContext)

        if (!prefs.isParentApprovalConfigured()) {
            Toast.makeText(this, "Parent approval isn't set up yet", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        binding.rescanButton.setOnClickListener { startScan() }
        binding.sendOtpButton.setOnClickListener { sendOtp() }
        binding.verifyButton.setOnClickListener { verifyOtp() }

        requestNeededPermissions()
    }

    override fun onDestroy() {
        scanner.stopScan()
        super.onDestroy()
    }

    private fun requestNeededPermissions() {
        val needed = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            needed += Manifest.permission.BLUETOOTH_SCAN
            needed += Manifest.permission.BLUETOOTH_CONNECT
        } else {
            needed += Manifest.permission.ACCESS_FINE_LOCATION
        }
        needed += Manifest.permission.SEND_SMS

        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            startScan()
        } else {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQUEST_PERMISSIONS)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            startScan()
        }
    }

    private fun startScan() {
        parent1Found = false
        parent2Found = false
        updateStatusLabels()
        binding.sendOtpButton.isEnabled = false
        binding.scanStatusText.text = getString(R.string.approval_scanning)

        val targets = setOfNotNull(prefs.parentDevice1Address, prefs.parentDevice2Address)
        scanner.startScan(targets, object : ParentProximityScanner.Listener {
            override fun onDeviceFound(address: String) {
                runOnUiThread {
                    if (address == prefs.parentDevice1Address) parent1Found = true
                    if (address == prefs.parentDevice2Address) parent2Found = true
                    updateStatusLabels()
                }
            }

            override fun onScanFinished() {
                runOnUiThread {
                    binding.sendOtpButton.isEnabled = parent1Found && parent2Found
                    binding.scanStatusText.text = if (parent1Found && parent2Found) {
                        "Both parent phones found nearby."
                    } else {
                        "Scan finished. Ask the missing parent(s) to come closer and tap 'Scan again'."
                    }
                }
            }
        })
    }

    private fun updateStatusLabels() {
        binding.parent1StatusText.text = getString(
            if (parent1Found) R.string.approval_parent1_found else R.string.approval_parent1_missing
        )
        binding.parent1StatusText.setTextColor(resources.getColor(if (parent1Found) R.color.accent_on else R.color.accent_off, theme))

        binding.parent2StatusText.text = getString(
            if (parent2Found) R.string.approval_parent2_found else R.string.approval_parent2_missing
        )
        binding.parent2StatusText.setTextColor(resources.getColor(if (parent2Found) R.color.accent_on else R.color.accent_off, theme))
    }

    private fun sendOtp() {
        val phone1 = prefs.parentPhone1
        val phone2 = prefs.parentPhone2
        if (phone1.isNullOrBlank() || phone2.isNullOrBlank()) return

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "SMS permission is required to send the OTP", Toast.LENGTH_LONG).show()
            return
        }

        try {
            otpManager.sendOtps(phone1, phone2, getString(R.string.app_name))
        } catch (e: Exception) {
            Toast.makeText(this, "Couldn't send SMS: ${e.message}", Toast.LENGTH_LONG).show()
            return
        }

        binding.sendOtpButton.visibility = View.GONE
        binding.otpSentText.visibility = View.VISIBLE
        binding.otp1Input.visibility = View.VISIBLE
        binding.otp2Input.visibility = View.VISIBLE
        binding.verifyButton.visibility = View.VISIBLE
    }

    private fun verifyOtp() {
        val input1 = binding.otp1Input.text.toString()
        val input2 = binding.otp2Input.text.toString()

        when (otpManager.verify(input1, input2)) {
            OtpManager.VerifyResult.SUCCESS -> {
                releaseUninstallBlockIfDeviceOwner()
                setResult(RESULT_OK)
                finish()
            }
            OtpManager.VerifyResult.WRONG -> showError(getString(R.string.error_otp_wrong))
            OtpManager.VerifyResult.EXPIRED -> showError(getString(R.string.error_otp_expired))
        }
    }

    /** Only takes effect if this device was provisioned as Device Owner (see README) -- a no-op otherwise. */
    private fun releaseUninstallBlockIfDeviceOwner() {
        try {
            val dpm = getSystemService(DevicePolicyManager::class.java)
            val admin = ComponentName(this, SafeGuardDeviceAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setUninstallBlocked(admin, packageName, false)
            }
        } catch (e: Exception) {
            // Not a device owner, or policy call failed -- approval still succeeded for the in-app gate.
        }
    }

    private fun showError(message: String) {
        binding.errorText.text = message
        binding.errorText.visibility = View.VISIBLE
    }

    companion object {
        private const val REQUEST_PERMISSIONS = 300
    }
}
