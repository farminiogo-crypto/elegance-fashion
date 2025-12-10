import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await adminLogin(email, password);
      if (success) {
        toast.success('Welcome, Admin!');
        navigate('/admin');
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-full mb-4">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="mb-2">Admin Access</h1>
            <p className="text-neutral-600">Sign in to access the admin dashboard</p>
          </div>

          {/* Demo Credentials */}
          <div className="mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm mb-2">Admin Credentials:</p>
            <p className="text-xs text-neutral-600">Email: admin@elegance.com</p>
            <p className="text-xs text-neutral-600">Password: admin123</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@elegance.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-neutral-900 hover:bg-neutral-800"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In as Admin'}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signin" className="text-sm text-neutral-600 hover:text-neutral-900">
              ← Back to customer login
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-neutral-600 hover:text-neutral-900">
            Back to Store
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
