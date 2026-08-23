import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin' : '/events'} replace />;
}
