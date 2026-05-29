import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ajusta la ruta a tu cliente de Supabase

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

 useEffect(() => {
    fetchNotifications();

    // Generamos un ID matemáticamente único para evitar colisiones de milisegundos en React Strict Mode
    const uniqueChannelId = `notif-${Math.random().toString(36).substring(2, 15)}`;
    
    const channel = supabase.channel(uniqueChannelId)
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sys_notifications' }, 
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('sys_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('sys_notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map(n => n.id);
    await supabase.from('sys_notifications').update({ is_read: true }).in('id', ids);
    setNotifications([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Icono de Campana */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-[#c4c7c7] hover:text-[#ffe16d] transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[24px]">notifications</span>
        
        {/* Círculo Rojo (Badge) */}
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ffb4ab] text-[#690005] font-mono text-[9px] font-bold border border-[#121414]">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Panel Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#121414] border border-[#444748] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden flex flex-col">
          <div className="p-3 bg-[#1a1c1c] border-b border-[#444748] flex justify-between items-center">
            <span className="font-mono text-xs text-[#e3e2e2] font-bold">NOTIFICACIONES</span>
            {notifications.length > 0 && (
              <button onClick={markAllAsRead} className="text-[10px] font-mono text-[#ffe16d] hover:underline cursor-pointer">
                Marcar todas leídas
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[#8e9192] font-mono text-xs">
                No hay alertas nuevas.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-4 border-b border-[#444748]/50 hover:bg-[#1a1c1c] transition-colors relative group">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${notif.type === 'CRITICAL' ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30' : 'bg-[#ffe16d]/10 text-[#ffe16d] border border-[#ffe16d]/30'}`}>
                      {notif.title}
                    </span>
                    <button onClick={() => markAsRead(notif.id)} className="text-[#8e9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                  <p className="text-sm text-[#e3e2e2] mt-2 leading-tight">{notif.message}</p>
                  <span className="text-[9px] text-[#8e9192] font-mono mt-2 block">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}