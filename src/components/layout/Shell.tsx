import { Outlet } from 'react-router-dom';
<<<<<<< HEAD
import TopBar from './TopBar';
=======
>>>>>>> feat-implement-frontend-design-GH23Da
import SideNav from './SideNav';
import ShortcutHelp from './ShortcutHelp';
import { ToastContainer } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import styles from './Shell.module.css';

export default function Shell() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  return (
    <div className={styles.shell}>
<<<<<<< HEAD
      <TopBar />
=======
>>>>>>> feat-implement-frontend-design-GH23Da
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
