package com.tensquad.safeguard.ui

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.tensquad.safeguard.R
import com.tensquad.safeguard.data.PrefsManager
import com.tensquad.safeguard.databinding.ActivitySetupParentsBinding

/**
 * One-time setup: pick the 2 already-paired parent Bluetooth devices and
 * their phone numbers. The actual Bluetooth pairing itself happens in
 * Android's own Bluetooth settings (there's no API for an app to pair
 * devices without user interaction there) -- this screen just lets you pick
 * from the resulting bonded-devices list and attach a phone number to each.
 */
class SetupParentsActivity : Activity() {

    private lateinit var binding: ActivitySetupParentsBinding
    private lateinit var prefs: PrefsManager
    private var pickingSlot = 0

    private var device1Address: String? = null
    private var device1Name: String? = null
    private var device2Address: String? = null
    private var device2Name: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySetupParentsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = PrefsManager(applicationContext)

        binding.parent1PhoneInput.setText(prefs.parentPhone1)
        binding.parent2PhoneInput.setText(prefs.parentPhone2)
        device1Address = prefs.parentDevice1Address
        device2Address = prefs.parentDevice2Address

        binding.openBluetoothSettingsButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
        }
        binding.pickDevice1Button.setOnClickListener { pickDevice(slot = 1) }
        binding.pickDevice2Button.setOnClickListener { pickDevice(slot = 2) }
        binding.saveParentsButton.setOnClickListener { onSaveClicked() }

        refreshDeviceLabels()
    }

    private fun pickDevice(slot: Int) {
        pickingSlot = slot
        if (!hasBluetoothConnectPermission()) {
            ActivityCompat.requestPermissions(this, arrayOf(bluetoothConnectPermissionName()), REQUEST_BT_PERMISSION)
            return
        }
        showBondedDevicePicker(slot)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_BT_PERMISSION) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                showBondedDevicePicker(pickingSlot)
            } else {
                Toast.makeText(this, "Bluetooth permission needed to pick a device", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showBondedDevicePicker(slot: Int) {
        val adapter = (getSystemService(BLUETOOTH_SERVICE) as BluetoothManager).adapter
        if (adapter == null || !adapter.isEnabled) {
            Toast.makeText(this, "Turn Bluetooth on first", Toast.LENGTH_SHORT).show()
            return
        }
        val bonded: Set<BluetoothDevice> = try {
            adapter.bondedDevices
        } catch (e: SecurityException) {
            emptySet()
        }
        if (bonded.isEmpty()) {
            Toast.makeText(this, "No paired devices found — pair the parent's phone first", Toast.LENGTH_LONG).show()
            return
        }
        val devicesList = bonded.toList()
        val names = devicesList.map { deviceLabel(it) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.btn_pick_device))
            .setItems(names) { _, which ->
                val chosen = devicesList[which]
                val label = deviceLabel(chosen)
                if (slot == 1) {
                    device1Address = chosen.address
                    device1Name = label
                } else {
                    device2Address = chosen.address
                    device2Name = label
                }
                refreshDeviceLabels()
            }
            .show()
    }

    private fun deviceLabel(device: BluetoothDevice): String {
        return try {
            device.name ?: device.address
        } catch (e: SecurityException) {
            device.address
        }
    }

    private fun refreshDeviceLabels() {
        binding.device1Selected.text = device1Name ?: device1Address ?: getString(R.string.no_device_selected)
        binding.device2Selected.text = device2Name ?: device2Address ?: getString(R.string.no_device_selected)
    }

    private fun onSaveClicked() {
        val phone1 = binding.parent1PhoneInput.text.toString().trim()
        val phone2 = binding.parent2PhoneInput.text.toString().trim()

        if (phone1.isEmpty() || phone2.isEmpty() || device1Address.isNullOrEmpty() || device2Address.isNullOrEmpty()) {
            showError(getString(R.string.error_parents_incomplete))
            return
        }
        if (device1Address == device2Address) {
            showError(getString(R.string.error_parents_same_device))
            return
        }

        prefs.parentPhone1 = phone1
        prefs.parentPhone2 = phone2
        prefs.parentDevice1Address = device1Address
        prefs.parentDevice2Address = device2Address
        setResult(RESULT_OK)
        finish()
    }

    private fun showError(message: String) {
        binding.errorText.text = message
        binding.errorText.visibility = View.VISIBLE
    }

    private fun hasBluetoothConnectPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, bluetoothConnectPermissionName()) == PackageManager.PERMISSION_GRANTED

    private fun bluetoothConnectPermissionName(): String =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Manifest.permission.BLUETOOTH_CONNECT
        else Manifest.permission.BLUETOOTH

    companion object {
        private const val REQUEST_BT_PERMISSION = 200
    }
}
