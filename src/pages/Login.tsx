"use client";

import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Mail, EyeOff, Eye, X } from "lucide-react";
import { assets } from "../assets/assets";
import { post, saveAuthData } from "../utils/service";

const ForgotPasswordModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success("Reset code sent to your email (Use code: 1234)");
      setStep(2);
      setLoading(false);
    }, 1000);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (otp !== "1234") {
      toast.error("Invalid reset code");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success("Password reset successfully!");
      onComplete();
      onClose();
      setStep(1);
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setLoading(false);
    }, 1000);
  };

  const handleClose = () => {
    setStep(1);
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-labelledby="forgot-password-title">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="forgot-password-title" className="text-lg font-semibold text-gray-900">
            {step === 1 ? "Reset Password" : "Enter Reset Code"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-secondary" />
            </div>
            <p className="text-xs text-gray-600">
              {step === 1 
                ? "Enter your email to receive a reset code" 
                : "Enter the code sent to your email and your new password"
              }
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none"
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors text-xs disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-secondary font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors text-xs disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs text-center tracking-widest transition-all outline-none"
                  placeholder="Enter 4-digit code"
                  maxLength="4"
                  disabled={loading}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none"
                  placeholder="New Password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none"
                  placeholder="Confirm New Password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors text-xs disabled:opacity-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-secondary font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors text-xs disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value) => {
    return value.length >= 6;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    let valid = true;

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    setSubmitted(true);

    if (valid) {
      setLoading(true);
      
      try {
        const credentials = {
          email,
          password
        };

        const response = await post('/auth/login', credentials);
        
        if (response.success) {
          saveAuthData(response.data.token, response.data.user);
          
          toast.success(response.message || 'Login successful!');
          navigate('/');
          
          setEmail("");
          setPassword("");
          setSubmitted(false);
        } else {
          toast.error(response.message || 'Login failed. Please try again.');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        toast.error(
          error.response?.data?.message || 
          error.message || 
          'Login failed. Please check your credentials and try again.'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <style jsx>{`
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-none::-webkit-scrollbar { 
          display: none;
        }
      `}</style>

      {/* Desktop Layout */}
      <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw] bg-white">
        {/* Left column: sign-in form */}
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="text-center mb-2">
                <div className="flex justify-center mb-6">
                  <img
                    src={assets.MainLogo}
                    alt="Social Gems"
                    className="h-12 w-fit object-contain"
                  />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome Back
                </h1>
                <p className="text-xs text-gray-600">
                  Sign in to your account
                </p>
              </div>

              {/* Login Form */}
              <form className="space-y-4" onSubmit={handleLogin} noValidate>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      placeholder="agency@socialgems.me"
                      className={`w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none ${
                        emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1">
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none ${
                        passwordError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-red-500 text-xs mt-1">
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button 
                    type="button"
                    className="text-xs text-primary hover:underline font-medium transition-colors"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-secondary font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors text-xs disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Right column: hero image */}
        <section className="hidden md:block flex-1 relative p-4">
          <div 
            className="absolute inset-4 rounded-3xl bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets.banner})` }}
          />
          <div className="absolute inset-4 rounded-3xl bg-black/10"></div>
        </section>
      </div>

      {/* Tablet Layout */}
      <div className="h-[100dvh] flex flex-col md:hidden bg-white">
        <div className="flex-1 flex flex-col">
          <div className="flex-shrink-0 p-6 pb-4">
            <div className="flex justify-center mb-4">
              <img
                src={assets.LogoIcon}
                alt="Social Gems"
                className="h-10 w-10 object-contain"
              />
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-xs text-gray-600">
                Sign in to your account
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 scrollbar-none">
            <form className="flex flex-col gap-4" onSubmit={handleLogin} noValidate>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="agency@socialgems.me"
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none ${
                      emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                    }`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {emailError && (
                  <p className="text-red-500 text-xs mt-1">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none ${
                      passwordError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button 
                  type="button"
                  className="text-xs text-primary hover:underline font-medium transition-colors"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-secondary font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors text-xs disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        {/* Hero Image for Tablet */}
        <div className="flex-1 relative min-h-[40vh]">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets.banner})` }}
          />
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="min-h-screen w-full flex flex-col md:hidden bg-white">
        <div className="flex-shrink-0 bg-primary py-8 px-4 text-center">
          <img
            src={assets.MainLogo}
            alt="Social Gems Logo"
            className="h-16 w-auto object-contain mx-auto"
          />
        </div>

        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          <div className="flex-shrink-0 p-6 pb-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-xs text-gray-600">
                Sign in to your account
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-none">
            <form className="flex flex-col gap-5 mb-8" onSubmit={handleLogin} noValidate>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="agency@socialgems.me"
                    className={`w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none ${
                      emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                    }`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {emailError && (
                  <p className="text-red-500 text-xs mt-1">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 text-xs transition-all outline-none ${
                      passwordError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button 
                  type="button"
                  className="text-xs text-primary hover:underline font-medium transition-colors"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-secondary font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors text-xs disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onComplete={() => {
          toast.success("You can now sign in with your new password");
        }}
      />
    </>
  );
};

export default Login;