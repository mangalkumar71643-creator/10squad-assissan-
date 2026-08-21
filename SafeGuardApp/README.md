# SafeGuard — Android adult-content blocker (parental control)

An Android app that blocks pornographic/adult websites device-wide by
filtering DNS lookups against a blocklist, with a parent-only PIN protecting
the on/off switch.

## How it works

1. On enable, the app starts a local **VPN** (`android.net.VpnService`) —
   this is the standard, no-root way for an Android app to inspect network
   traffic. No traffic actually leaves the device through a remote server;
   everything is processed locally.
2. Instead of tunnelling *all* traffic (which would require reimplementing a
   full TCP/IP stack), the VPN's routes are scoped **only to the device's
   DNS server IPs** (`VpnService.Builder.addRoute(dnsIp, 32)`). That means
   every other connection (browsing, apps, video, everything) flows over the
   network completely normally and at full speed — only DNS lookups pass
   through the app.
3. Search engines and YouTube get an extra layer: queries for google.*,
   bing.com and youtube.com are rewritten (via the provider's own official
   "forced safe mode" DNS alias -- `forcesafesearch.google.com`,
   `strict.bing.com`, `restrictstrict.youtube.com`) so those providers
   enforce safe search server-side, regardless of what any in-app SafeSearch
   toggle is set to. Without this, a plain domain blocklist alone still lets
   explicit thumbnails/snippets show up directly on a search results page
   even though the actual sites those results link to stay blocked.
4. Every DNS query is checked against a blocklist of adult-site domains
   (`app/src/main/assets/adult_domains.txt`, plus an optional larger list you
   can update from a URL). A blocked query gets an `NXDOMAIN` answer instead
   of being forwarded, so the browser/app simply can't resolve the site and
   fails to connect — the same mechanism used by services like OpenDNS
   FamilyShield or CleanBrowsing.
5. A parent PIN (stored only as a salted SHA-256 hash, never in plaintext)
   is required to turn protection off, change the PIN, or (as extra
   friction) to deactivate the app's Device Admin registration before it can
   be uninstalled.
6. Protection state survives reboot via a `BOOT_COMPLETED` receiver.
7. Optionally, once **2-parent approval** is set up (see below), disabling
   protection requires *both* registered parent phones to be physically
   nearby (Bluetooth) and both to enter an SMS OTP sent to their own number
   — this replaces the plain PIN gate for that action.

## 2-parent approval (optional)

From the main screen, **"Set up parent approval"** lets you register:
- 2 parent phone numbers (for SMS OTP), and
- 2 already-Bluetooth-paired parent phones (pair them first in Android's own
  Bluetooth settings — there's no API for an app to pair devices silently,
  so this is a one-time manual step per parent phone).

Once both are set, turning protection off routes through
`ParentApprovalActivity` instead of the plain PIN screen:
1. It scans for the 2 saved Bluetooth MAC addresses nearby (not "any phone"
   — specifically the ones bonded during setup, which Android's own pairing
   already authenticated).
2. Once both are found, it sends a random 6-digit OTP by SMS to each parent's
   number (`OtpManager`, 5-minute validity, kept in memory only).
3. Both parents tell the child their code; both must be entered correctly to
   unlock.

This gates the in-app "turn protection off" action immediately. To make it
**also** gate real OS-level uninstall, see Device Owner setup below — without
that, a child who knows Android Settings can still deactivate Device Admin
manually and uninstall regardless of what this screen enforces (see Known
limitations).

## Blocking other VPN apps

Android only allows one active VPN at a time. Without anything extra, a
child could just install a different VPN app and connect it -- that
silently disconnects SafeGuard's tunnel and un-filters everything. The
**"Lock other VPN apps"** button on the main screen addresses this:

- **Without Device Owner:** opens Android's own VPN settings screen. Tap the
  gear icon next to SafeGuard and turn on **"Always-on VPN"** and **"Block
  connections without VPN"**. Once set, Android itself refuses to let any
  other app establish a competing VPN connection while SafeGuard holds that
  slot, and cuts off all network traffic device-wide if SafeGuard's tunnel
  ever drops, rather than silently falling back to unfiltered internet. This
  is a one-time manual step (there's no API for an app to flip this switch
  for itself without Device Owner).
- **With Device Owner** (see below): `MainActivity.lockDownVpnIfDeviceOwner()`
  sets the same always-on + lockdown state automatically via
  `DevicePolicyManager.setAlwaysOnVpnPackage()` every time protection turns
  on, and additionally locks that Settings screen so it can't be changed
  from Settings at all -- only by the app itself.

## Device Owner setup (optional, for a real uninstall block)

Plain Device Admin (what's active by default) can be deactivated from
Settings > Security > Device admin apps with no involvement from this app at
all — it's friction, not a lock. **Device Owner** mode is different: it gives
the app `DevicePolicyManager.setUninstallBlocked()`, which genuinely removes
the uninstall option from Settings > Apps until the app itself calls it with
`false` — which `ParentApprovalActivity` now does automatically on a
successful 2-parent approval.

To provision it:
1. The phone must have **no Google account signed in yet** — Device Owner
   provisioning is blocked once any account exists. Use a factory-reset
   phone, or remove all accounts first (Settings > Accounts).
2. Install the APK (`adb install -r app-debug.apk`) without opening it yet.
3. From a computer with `adb`:
   ```
   adb shell dpm set-device-owner com.tensquad.safeguard/.receiver.SafeGuardDeviceAdminReceiver
   ```
4. Now open the app and finish setup as usual (PIN, 2-parent approval,
   enable protection). `MainActivity.blockUninstallIfDeviceOwner()` detects
   device-owner status automatically and blocks uninstall the moment
   protection turns on.

Notes: this is meant for a device you (the parent) control the initial setup
of — it's the same mechanism enterprise-managed phones use. Even with it,
someone with access to the phone's stock recovery menu can still factory
reset the device from outside Android entirely (hardware/bootloader level,
not something any app can prevent) — see the reasoning in-chat about why
that's an acceptable, self-limiting escape hatch for this use case.

## Project structure

```
app/src/main/java/com/tensquad/safeguard/
  ui/            MainActivity, SetPinActivity, PinLockActivity,
                 SetupParentsActivity, ParentApprovalActivity
  vpn/           SafeGuardVpnService, DnsSinkholeEngine, PacketBuilder
  bluetooth/     ParentProximityScanner
  data/          PrefsManager, BlocklistRepository, OtpManager
  receiver/      BootReceiver, SafeGuardDeviceAdminReceiver
app/src/main/assets/adult_domains.txt   bundled offline blocklist
```

## Building it

You need **Android Studio** (Koala/2024.1+) or a command-line Gradle + the
Android SDK.

**Android Studio (recommended):**
1. Open this folder (`SafeGuardApp/`) as a project.
2. Let Gradle sync — Android Studio will generate the Gradle wrapper for you
   automatically the first time (this project ships without a checked-in
   `gradle-wrapper.jar`, since it's a binary file).
3. Connect a device (or start an emulator) and click Run.

**Command line**, if you have Gradle installed already:
```
echo "sdk.dir=/path/to/your/Android/sdk" > local.properties
gradle wrapper --gradle-version 8.7
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
`local.properties` is intentionally not committed (it's machine-specific —
Android Studio recreates it automatically, or set it by hand for the CLI as
shown above / export `ANDROID_HOME` instead).

**Running the unit tests** (no device/emulator needed):
```
gradle testDebugUnitTest
```

## Using the app

1. First launch asks you to set a 4–6 digit **parent PIN**.
2. It will then offer to register as a **Device Admin** (optional but
   recommended) — this makes uninstalling the app require deactivating admin
   first, in Settings, adding real friction for a child.
3. Flip the big switch **ON**. Android will show its standard "SafeGuard
   wants to set up a VPN connection" system dialog — this is required by the
   OS for any local VPN/filtering app and is expected; tap OK.
4. To turn protection **OFF**, you'll be asked for the PIN.
5. **"Update blocklist now"** pulls a fresh domain list from the URL you
   configure in `BlocklistRepository.REMOTE_BLOCKLIST_URL` (see below) — it's
   left blank by default so the app doesn't silently trust a third-party
   host you haven't chosen yourself.

### Adding a bigger/updated blocklist

`BlocklistRepository.REMOTE_BLOCKLIST_URL` (in
`app/src/main/java/com/tensquad/safeguard/data/BlocklistRepository.kt`) is
blank by default. Point it at any plain-text list you trust — one domain per
line, or standard `/etc/hosts` format (`0.0.0.0 domain.com`). Well-known
maintained public options you can look up and choose yourself include
projects like **The Blocklist Project** and **StevenBlack/hosts** (both host
categorized "porn" lists on GitHub) — search for their current raw file URL
and paste it in, since we deliberately don't hardcode a third-party URL for
you sight-unseen. The bundled `adult_domains.txt` keeps working offline as a
fallback either way.

## Known limitations (please read)

This is a genuinely working DNS-level filter, not a toy — but be clear-eyed
about what it does and doesn't cover:

- **DNS-based only.** It blocks *named* domains. It cannot inspect video
  content itself, so it can't detect adult content on a not-yet-listed
  domain, a general search engine, cloud storage links, or social media DMs.
  Combine it with your platform's built-in parental controls / Google Family
  Link for broader coverage.
- **Encrypted DNS bypass.** If an app/browser uses **DNS-over-HTTPS** to a
  resolver IP that isn't one of the ones this VPN captured (i.e. not the
  system-configured DNS server), the query bypasses this filter entirely.
  Chrome, Firefox etc. mostly respect the system/network DNS settings by
  default, but a technically savvy teenager could switch a browser's
  "Secure DNS" setting to bypass it.
- **TCP fallback DNS and DoT are dropped, not filtered.** `DnsSinkholeEngine`
  only relays UDP. The rare TCP:53 fallback (large/truncated DNS responses)
  and DNS-over-TLS (port 853) to the captured DNS IPs are simply dropped —
  documented in the code — rather than silently allowed through unfiltered.
- **Device Admin uninstall protection is friction, not a lock.** A
  determined technical user can still remove Device Admin via Settings and
  uninstall. For stronger enforcement you'd want a proper MDM / Device Owner
  setup, which requires provisioning the device differently (out of scope
  here).
- **IPv6 DNS is not handled** in this MVP — only IPv4 DNS servers are routed
  into the tunnel. On an IPv6-only network, filtering won't engage; the
  README flags this as the first thing to extend.
- Not published anywhere — you build and install it yourself (`adb install`
  or Android Studio's Run button), so there's no Play Store review step to
  rely on; test it on your own device before trusting it.

## Permissions used and why

| Permission | Why |
|---|---|
| `INTERNET` / `ACCESS_NETWORK_STATE` | Forward non-blocked DNS queries, read the active network's DNS servers |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE` | Required by Android to keep the VPN filtering service alive while active |
| `RECEIVE_BOOT_COMPLETED` | Resume protection automatically after a reboot |
| `POST_NOTIFICATIONS` | Show the "protection is on" ongoing notification (Android 13+) |
| `BIND_DEVICE_ADMIN` (declared on the receiver) | Optional uninstall friction, see above |
| `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` (+ legacy `BLUETOOTH`/`BLUETOOTH_ADMIN`/`ACCESS_FINE_LOCATION` below API 31) | Detect the 2 paired parent phones nearby for approval |
| `SEND_SMS` | Send the OTP to each parent's registered number for approval |


## SafeGuard accessibility + protected apps

This merged build registers `SafeGuardAccessibilityService`, so the app appears under Android Accessibility > Downloaded apps. The service is intentionally minimal and does not store or transmit screen contents.

The main screen also has `Enable Accessibility protection` and `Choose protected apps`. The protected-app picker is intentionally enabled only when SafeGuard is Device Owner, because `DevicePolicyManager.setUninstallBlocked()` is a Device Owner policy. Normal Device Admin does not provide a guaranteed uninstall block for arbitrary apps.

To provision Device Owner for development/testing, use Android's supported provisioning flow on a test device. Do not rely on Device Owner APIs for a normal consumer-installed Play Store app.
