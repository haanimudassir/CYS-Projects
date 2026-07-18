import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function NotificationStack() {
  const { notifications } = useApp();
  return (
    <>
      {notifications.map((n, i) => (
        <div
          key={n.id}
          className={`notif ${n.type || ''}`}
          style={{ bottom: 24 + i * 56 }}
        >
          {n.msg}
        </div>
      ))}
    </>
  );
}
