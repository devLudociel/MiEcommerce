import { useState } from 'react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function SettingsPanel() {
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
  });
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showEmail: false,
    showActivity: true,
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSaveSettings = () => {
    alert('Configuración guardada correctamente');
  };

  const handleChangePassword = () => {
    alert('Función de cambio de contraseña');
  };

  const handleDeleteAccount = () => {
    if (
      confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')
    ) {
      alert('Función de eliminar cuenta');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gradient-primary mb-6">Configuración de la Cuenta</h2>

      {/* Información de la cuenta */}
      <div className="card card-cyan p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Información de la cuenta</h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">Correo electrónico</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
            />
            <p className="text-sm text-gray-500 mt-1">
              El correo electrónico no puede ser modificado
            </p>
          </div>
          <button onClick={handleChangePassword} className="btn btn-outline">
            Cambiar contraseña
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="card card-magenta p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Preferencias de notificaciones</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">Notificaciones por email</span>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
              className="w-5 h-5 text-magenta-500 rounded focus:ring-magenta-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">Notificaciones push</span>
            <input
              type="checkbox"
              checked={notifications.push}
              onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
              className="w-5 h-5 text-magenta-500 rounded focus:ring-magenta-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">Notificaciones por SMS</span>
            <input
              type="checkbox"
              checked={notifications.sms}
              onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
              className="w-5 h-5 text-magenta-500 rounded focus:ring-magenta-500"
            />
          </label>
        </div>
      </div>

      {/* Privacidad */}
      <div className="card card-yellow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Configuración de privacidad</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">Perfil público</span>
            <input
              type="checkbox"
              checked={privacy.profilePublic}
              onChange={(e) => setPrivacy({ ...privacy, profilePublic: e.target.checked })}
              className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">Mostrar email público</span>
            <input
              type="checkbox"
              checked={privacy.showEmail}
              onChange={(e) => setPrivacy({ ...privacy, showEmail: e.target.checked })}
              className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium text-gray-700">Mostrar actividad</span>
            <input
              type="checkbox"
              checked={privacy.showActivity}
              onChange={(e) => setPrivacy({ ...privacy, showActivity: e.target.checked })}
              className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500"
            />
          </label>
        </div>
      </div>

      {/* Guardar cambios */}
      <button onClick={handleSaveSettings} className="btn btn-primary w-full">
        Guardar cambios
      </button>

      {/* Zona de peligro */}
      <div className="card border-2 border-red-300 bg-red-50 p-6">
        <h3 className="text-xl font-semibold text-red-900 mb-4">Zona de peligro</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Cerrar sesión</p>
              <p className="text-sm text-gray-600">Cerrar sesión en todos los dispositivos</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Eliminar cuenta</p>
              <p className="text-sm text-gray-600">
                Eliminar permanentemente tu cuenta y todos tus datos
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
