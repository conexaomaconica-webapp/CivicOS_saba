import Foundation
import Capacitor
import LocalAuthentication
import Security

@objc(BiometricKeychainPlugin)
public class BiometricKeychainPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricKeychainPlugin"
    public let jsName = "BiometricKeychain"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveProtectedToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readProtectedToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasProtectedToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearProtectedToken", returnType: CAPPluginReturnPromise)
    ]

    private let keychainService = "com.conexaomaconica.app.biometric.refresh"

    @objc func getAvailability(_ call: CAPPluginCall) {
        let context = LAContext()
        var authError: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError)

        let biometryType: String
        switch context.biometryType {
        case .faceID, .opticID:
            biometryType = "faceId"
        case .touchID:
            biometryType = "touchId"
        default:
            biometryType = "none"
        }

        var errorCode = ""
        if !available, let err = authError {
            errorCode = mapLAErrorCode(err.code)
        }

        call.resolve([
            "available": available,
            "biometryType": biometryType,
            "errorCode": errorCode
        ])
    }

    @objc func saveProtectedToken(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), !token.isEmpty,
              let account = call.getString("account"), !account.isEmpty else {
            call.reject("Parâmetros inválidos para armazenamento protegido.", "INVALID_PARAMS")
            return
        }

        guard let tokenData = token.data(using: .utf8) else {
            call.reject("Não foi possível codificar o token.", "ENCODING_ERROR")
            return
        }

        var accessError: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryCurrentSet,
            &accessError
        ) else {
            let desc = accessError?.takeRetainedValue().localizedDescription ?? "Falha ao criar política biométrica no Keychain."
            call.reject(desc, "ACCESS_CONTROL_ERROR")
            return
        }

        deleteAllServiceItems()

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecAttrAccessControl as String: accessControl,
            kSecValueData as String: tokenData
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecSuccess {
            call.resolve(["saved": true])
        } else {
            call.reject("Erro ao gravar token protegido no Keychain (\(status)).", mapOSStatusCode(status))
        }
    }

    @objc func readProtectedToken(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Confirme sua identidade para acessar sua conta na Conexão Maçônica."
        let context = LAContext()
        context.localizedReason = reason
        context.localizedFallbackTitle = ""

        DispatchQueue.global(qos: .userInitiated).async {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: self.keychainService,
                kSecMatchLimit as String: kSecMatchLimitOne,
                kSecReturnAttributes as String: true,
                kSecReturnData as String: true,
                kSecUseAuthenticationContext as String: context
            ]

            var result: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &result)

            if status == errSecSuccess,
               let dict = result as? [String: Any],
               let data = dict[kSecValueData as String] as? Data,
               let token = String(data: data, encoding: .utf8),
               let account = dict[kSecAttrAccount as String] as? String {
                call.resolve([
                    "token": token,
                    "account": account
                ])
                return
            }

            call.reject("Falha na leitura biométrica do Keychain (\(status)).", self.mapOSStatusCode(status))
        }
    }

    @objc func hasProtectedToken(_ call: CAPPluginCall) {
        let context = LAContext()
        context.interactionNotAllowed = true

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnAttributes as String: false,
            kSecReturnData as String: false,
            kSecUseAuthenticationContext as String: context
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        let exists = (status == errSecSuccess || status == errSecInteractionNotAllowed)
        call.resolve(["exists": exists])
    }

    @objc func clearProtectedToken(_ call: CAPPluginCall) {
        let status = deleteAllServiceItems()
        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve(["cleared": true])
        } else {
            call.reject("Não foi possível limpar o Keychain (\(status)).", mapOSStatusCode(status))
        }
    }

    @discardableResult
    private func deleteAllServiceItems() -> OSStatus {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService
        ]
        return SecItemDelete(query as CFDictionary)
    }

    private func mapLAErrorCode(_ code: Int) -> String {
        switch code {
        case LAError.biometryNotAvailable.rawValue:
            return "BIOMETRY_UNAVAILABLE"
        case LAError.biometryNotEnrolled.rawValue:
            return "BIOMETRY_NOT_ENROLLED"
        case LAError.biometryLockout.rawValue:
            return "BIOMETRY_LOCKOUT"
        case LAError.passcodeNotSet.rawValue:
            return "PASSCODE_NOT_SET"
        default:
            return "BIOMETRY_UNAVAILABLE"
        }
    }

    private func mapOSStatusCode(_ status: OSStatus) -> String {
        switch status {
        case errSecUserCanceled:
            return "USER_CANCEL"
        case errSecAuthFailed:
            return "AUTH_FAILED"
        case errSecItemNotFound:
            return "ITEM_NOT_FOUND"
        case errSecInteractionNotAllowed:
            return "BIOMETRY_LOCKOUT"
        default:
            return "KEYCHAIN_ERROR_\(status)"
        }
    }
}

