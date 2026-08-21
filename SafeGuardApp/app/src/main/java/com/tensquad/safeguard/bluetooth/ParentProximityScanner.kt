package com.tensquad.safeguard.bluetooth

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter

/**
 * Scans for nearby Bluetooth devices and reports which of the two
 * previously-paired (bonded) target addresses are currently in range.
 *
 * Discovery finds any nearby advertising device -- what turns this into a
 * check for a *specific known* parent phone, rather than "any phone
 * nearby," is that a match only counts when the discovered MAC address
 * equals one already bonded through Android's own Bluetooth pairing (see
 * SetupParentsActivity), which authenticates the device at pairing time.
 */
class ParentProximityScanner(private val context: Context) {

    interface Listener {
        fun onDeviceFound(address: String)
        fun onScanFinished()
    }

    private var receiver: BroadcastReceiver? = null
    private val adapter: BluetoothAdapter? by lazy {
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
    }

    fun isBluetoothEnabled(): Boolean = adapter?.isEnabled == true

    fun startScan(targetAddresses: Set<String>, listener: Listener) {
        val bt = adapter
        if (bt == null || !bt.isEnabled) {
            listener.onScanFinished()
            return
        }

        stopScan()
        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }
        val newReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                when (intent.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        @Suppress("DEPRECATION")
                        val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                        val address = device?.address ?: return
                        if (targetAddresses.contains(address)) {
                            listener.onDeviceFound(address)
                        }
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        listener.onScanFinished()
                    }
                }
            }
        }
        receiver = newReceiver
        context.registerReceiver(newReceiver, filter)

        val started = try {
            if (bt.isDiscovering) bt.cancelDiscovery()
            bt.startDiscovery()
        } catch (e: SecurityException) {
            false
        }
        if (!started) {
            listener.onScanFinished()
        }
    }

    fun stopScan() {
        try {
            adapter?.let { if (it.isDiscovering) it.cancelDiscovery() }
        } catch (e: SecurityException) {
            // Missing runtime permission -- nothing to cancel from our side either way.
        }
        receiver?.let {
            try {
                context.unregisterReceiver(it)
            } catch (e: IllegalArgumentException) {
                // Already unregistered.
            }
        }
        receiver = null
    }
}
