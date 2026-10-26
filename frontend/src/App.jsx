import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Existing Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

// New Customer, Delivery Partner & Invitation Pages
import AcceptInvitation from './pages/AcceptInvitation';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import CustomerMenu from './pages/CustomerMenu';
import CustomerOrders from './pages/CustomerOrders';
import TrackOrder from './pages/TrackOrder';
import CustomerAddresses from './pages/CustomerAddresses';
import DeliveryDashboard from './pages/DeliveryDashboard';
import AdminDeliveryPartners from './pages/AdminDeliveryPartners';
import AdminDeliveryAssignments from './pages/AdminDeliveryAssignments';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <Navigate to="/dashboard" replace />;
    case 'cashier':
      return <Navigate to="/billing" replace />;
    case 'delivery_partner':
      return <Navigate to="/delivery/dashboard" replace />;
    case 'customer':
    default:
      return <Navigate to="/menu" replace />;
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication & Invitation routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invitation/:token" element={<AcceptInvitation />} />

          {/* Customer Portal Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
            <Route element={<MainLayout />}>
              <Route path="/menu" element={<CustomerMenu />} />
              <Route path="/my-orders" element={<CustomerOrders />} />
              <Route path="/track-order/:id" element={<TrackOrder />} />
              <Route path="/addresses" element={<CustomerAddresses />} />
            </Route>
          </Route>

          {/* Delivery Partner Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['delivery_partner', 'admin']} />}>
            <Route element={<MainLayout />}>
              <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
            </Route>
          </Route>

          {/* In-Store POS Protected Routes (Cashier and Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'cashier']} />}>
            <Route element={<MainLayout />}>
              <Route path="/billing" element={<Billing />} />
            </Route>
          </Route>

          {/* Shared User Profile Route */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'cashier', 'delivery_partner', 'customer']} />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Administrator Exclusive Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/admin/delivery-partners" element={<AdminDeliveryPartners />} />
              <Route path="/admin/delivery-assignments" element={<AdminDeliveryAssignments />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/ai-insights" element={<Settings initialTab="ai-insights" />} />
            </Route>
          </Route>

          {/* Redirect all unmatched routes */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
