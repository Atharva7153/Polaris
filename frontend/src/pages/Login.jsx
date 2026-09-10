import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Snowflake, ArrowRight, Thermometer, Zap, Shield, Globe } from 'lucide-react';
import { Compass, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D8E7F0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E3448',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      backgroundColor: '#F6FAFD',
    }}>
      {/* Left panel */}
      <div style={{
        display: 'none',
        width: '55%', flexShrink: 0,
        padding: '60px 80px',
        borderRight: '1px solid #D8E7F0',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
        className="login-left-panel"
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '12px',
            backgroundColor: '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}>
            <Snowflake style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#12304A', letterSpacing: '0.08em', margin: 0 }}>
              POLARIS
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Antarctic Operations Platform
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#12304A', lineHeight: 1.3, marginBottom: '16px' }}>
          Digital twin for<br />
          <span style={{ color: '#2563EB' }}>Antarctica's</span> research stations.
        </h2>
        <p style={{ fontSize: '16px', color: '#64748B', lineHeight: 1.7, marginBottom: '40px', maxWidth: '440px' }}>
          Real-time monitoring, predictive maintenance, and intelligent operations management for India's polar research infrastructure.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { icon: Thermometer, label: 'Sensors', value: '2,400+' },
            { icon: Zap, label: 'Power Nodes', value: '18' },
            { icon: Shield, label: 'Risk Models', value: '4' },
            { icon: Globe, label: 'Latency', value: '< 120ms' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '16px 20px',
              backgroundColor: '#F6FAFD', border: '1px solid #D8E7F0', borderRadius: '10px',
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon style={{ width: '20px', height: '20px', color: '#2563EB' }} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#12304A', lineHeight: 1, marginBottom: '4px' }}>{value}</div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}>
              <Snowflake style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#12304A', letterSpacing: '0.08em' }}>POLARIS</div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>Mission Control</div>
            </div>
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#12304A', margin: '0 0 8px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '15px', color: '#64748B', margin: '0 0 32px' }}>
            Sign in to access Mission Control
          </p>

          {error && (
            <div style={{
              padding: '14px 18px', marginBottom: '24px',
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', fontSize: '14px', color: '#DC2626', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#64748B', marginBottom: '8px',
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#64748B', marginBottom: '8px',
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '14px 20px',
                backgroundColor: loading ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                border: 'none', borderRadius: '10px',
                fontSize: '16px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                marginTop: '8px',
              }}
            >
              {loading ? 'Authenticating…' : (
                <>
                  Authenticate
                  <ArrowRight style={{ width: '18px', height: '18px' }} />
                </>
              )}
            </button>
          </form>

          <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', marginTop: '32px' }}>
            POLARIS v2 · Indian Antarctic Program
          </p>
        </div>
      </div>
    </div>
  );
}
