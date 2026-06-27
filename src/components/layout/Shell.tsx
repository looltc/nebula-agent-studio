import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import ShortcutHelp from './ShortcutHelp';
import { ToastContainer } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import styles from './Shell.module.css';

export default function Shell() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  return (
    <div className={styles.shell}>
      <div className={styles.body} data-collapsed={collapsed}>
        <SideNav />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <ShortcutHelp />
    </div>
  );
}
