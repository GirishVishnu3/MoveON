"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import { setTokens } from 'shared/src/store/authSlice';
import { apiClient } from 'shared/src/api/axios';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export default function DriverBasicOnboardingWizard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Streamlined 4-Step Verification Wizard
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: '',
    lastName: '',
    phone: user?.phone_number || '',
    email: '',
    dob: '1996-01-01',
    gender: 'MALE',
    preferredLanguage: 'en',
    streetAddress: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',

    // Step 2: Aadhaar & Driving Licence
    aadhaarNumber: '',
    aadhaarUrl: '',
    dlNumber: '',
    dlUrl: '',

    // Step 3: Vehicle & RC
    vehicleNumber: '',
    make: 'Tata',
    model: 'Winger',
    year: 2022,
    category: 'SEDAN',
    rcNumber: '',
    rcUrl: '',

    // Step 4: Bank Details & Agreement
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    bankName: 'SBI',
    upiId: '',
    agreementAccepted: true,
  });

  useEffect(() => {
    setMounted(true);
    const phone = user?.phone_number || formData.phone;
    if (phone) {
      try {
        const isCompletedLocally = localStorage.getItem(`moveon_driver_completed_${phone}`);
        if (isCompletedLocally === 'true') {
          router.replace('/driver/dashboard');
          return;
        }
      } catch { /* ignore */ }
      checkStatus(phone);
    }
  }, [user]);

  const checkStatus = async (phone: string) => {
    try {
      const res = await apiClient.get(`/driver/onboarding/status?phone_number=${phone}`);
      const status = res.data;
      
      // If fully approved → go to driver setup
      if (status.approval_status === 'APPROVED') {
        try { localStorage.setItem(`moveon_driver_completed_${phone}`, 'true'); } catch { /* ignore */ }
        router.replace('/driver/setup');
        return;
      }
      
      // If already submitted/under review → pending tracking page (don't show form again)
      if (
        status.onboarding_status === 'COMPLETED' ||
        status.profile_completed ||
        status.approval_status === 'UNDER_REVIEW'
      ) {
        router.replace('/onboarding/driver/pending');
        return;
      }
    } catch { /* ignore if non-existent driver — show form */ }
  };

  const handleInputChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    try {
      localStorage.setItem('moveon_driver_basic_onboarding', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleFileUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange(field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatErrorMessage = (detail: any): string => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
    }
    if (detail && typeof detail === 'object') {
      return detail.msg || JSON.stringify(detail);
    }
    return 'An unexpected error occurred. Please check inputs.';
  };

  const handleStepSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const phone = formData.phone || user?.phone_number;

      // STEP 1 Validation
      if (step === 1) {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          setError('First Name and Last Name are required.');
          setLoading(false);
          return;
        }
        if (!phone || phone.length < 10) {
          setError('A valid 10-digit mobile number is required.');
          setLoading(false);
          return;
        }
        if (!formData.email || !formData.email.includes('@')) {
          setError('A valid email address is required.');
          setLoading(false);
          return;
        }
        setStep(2);
        setLoading(false);
        return;
      }

      // STEP 2 Validation — both ID and photo are mandatory
      if (step === 2) {
        if (!formData.aadhaarNumber || formData.aadhaarNumber.replace(/\s/g, '').length < 12) {
          setError('Please enter a valid 12-digit Aadhaar Card Number.');
          setLoading(false);
          return;
        }
        if (!formData.aadhaarUrl) {
          setError('Please upload a photo of your Aadhaar Card.');
          setLoading(false);
          return;
        }
        if (!formData.dlNumber) {
          setError('Please enter your Driving Licence (DL) Number.');
          setLoading(false);
          return;
        }
        if (!formData.dlUrl) {
          setError('Please upload a photo of your Driving Licence.');
          setLoading(false);
          return;
        }
        setStep(3);
        setLoading(false);
        return;
      }

      // STEP 3 Validation — vehicle number AND RC photo are mandatory
      if (step === 3) {
        if (!formData.vehicleNumber) {
          setError('Please enter your Vehicle Registration Number (e.g. KA-03-MR-1234).');
          setLoading(false);
          return;
        }
        if (!formData.rcUrl) {
          setError('Please upload a photo of your Vehicle RC (Registration Certificate).');
          setLoading(false);
          return;
        }
        setStep(4);
        setLoading(false);
        return;
      }

      // STEP 4: Final Submission of all verification items
      if (step === 4) {
        if (!formData.agreementAccepted) {
          setError('You must accept the Driver Partner Agreement.');
          setLoading(false);
          return;
        }

        // 1. Register Driver Basic Profile
        const regPayload = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: phone,
          email: formData.email,
          dob: formData.dob,
          gender: formData.gender,
          preferred_language: formData.preferredLanguage,
          street_address: formData.streetAddress || 'City Center',
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          password: 'Password123!',
          emergency_contact_name: 'Contact',
          emergency_contact_phone: '9988776655',
          emergency_contact_relationship: 'Family',
          profile_photo_url: 'https://example.com/driver_photo.jpg'
        };
        const regRes = await apiClient.post('/driver/auth/register', regPayload);
        dispatch(setTokens({
          accessToken: regRes.data.access_token,
          refreshToken: regRes.data.refresh_token
        }));

        // 2. Upload Aadhaar Card
        await apiClient.post(`/driver/onboarding/documents?phone_number=${phone}`, {
          document_type: 'AADHAAR',
          document_number: formData.aadhaarNumber,
          file_url: formData.aadhaarUrl || 'https://example.com/aadhaar.jpg'
        });

        // 3. Upload Driving Licence
        await apiClient.post(`/driver/onboarding/documents?phone_number=${phone}`, {
          document_type: 'DL',
          document_number: formData.dlNumber,
          file_url: formData.dlUrl || 'https://example.com/dl.jpg'
        });

        // 4. Register Vehicle & RC
        await apiClient.post(`/driver/onboarding/vehicle?phone_number=${phone}`, {
          vehicle_number: formData.vehicleNumber,
          make: formData.make,
          model: formData.model,
          year: Number(formData.year) || 2022,
          category: formData.category,
          rc_number: formData.rcNumber || `RC-${formData.vehicleNumber}`,
          rc_url: formData.rcUrl || 'https://example.com/rc.jpg',
          insurance_url: 'https://example.com/ins.jpg',
          puc_url: 'https://example.com/puc.jpg'
        });

        // 5. Submit Bank Info
        if (formData.accountNumber && formData.ifscCode) {
          await apiClient.post(`/driver/onboarding/bank?phone_number=${phone}`, {
            account_number: formData.accountNumber,
            ifsc_code: formData.ifscCode,
            account_holder_name: (formData.accountHolderName || `${formData.firstName} ${formData.lastName}`).trim() || 'Driver Account',
            bank_name: formData.bankName || 'State Bank of India',
            upi_id: formData.upiId || `${formData.firstName.toLowerCase().replace(/\s+/g, '')}@upi`
          });
        }

        // 6. Complete Onboarding & Redirect to Dashboard
        await apiClient.post(`/driver/onboarding/submit?phone_number=${phone}`, {
          agreement_accepted: true,
          selfie_url: 'https://example.com/selfie.jpg'
        });

        // Mark local flags so user never re-enters onboarding
        try {
          localStorage.setItem(`moveon_driver_completed_${phone}`, 'true');
          localStorage.removeItem('moveon_driver_basic_onboarding');
        } catch { /* ignore */ }

        setSuccessMsg('Registration & verification details submitted! Redirecting to Verification Tracker...');
        setTimeout(() => {
          router.replace('/onboarding/driver/pending');
        }, 1000);
      }

    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(formatErrorMessage(detail));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
    }
  };

  const stepVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.1 } 
    },
    exit: { 
      opacity: 0, 
      x: -20, 
      transition: { duration: 0.3, ease: "easeIn" } 
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Animated Background Gradients */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-xl w-full mx-auto bg-gray-900/60 backdrop-blur-2xl border border-gray-800/60 rounded-[2rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative z-10"
      >
        
        {/* Top Back to Role Selection */}
        <motion.div className="mb-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <button
            type="button"
            onClick={() => router.push('/auth/select-role')}
            className="text-xs font-bold text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <span>←</span> Back to Role Selection
          </button>
        </motion.div>

        {/* Progress Header */}
        <div className="mb-6">
          <motion.span 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-xs font-bold text-emerald-500 uppercase tracking-widest"
          >
            MoveON Driver Verification (1-Time Setup)
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-3xl font-black text-white mt-1"
          >
            Step {step} of 4
          </motion.h1>
          <div className="h-1.5 bg-gray-800/80 rounded-full mt-4 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="mb-6 p-4 bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-bold rounded-2xl flex items-center gap-3 overflow-hidden"
            >
              <span>⚠️</span>
              <p className="flex-1">{error}</p>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="mb-6 p-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-3 overflow-hidden"
            >
              <span>✅</span>
              <p className="flex-1">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={step}>
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.h2 variants={itemVariants} className="text-xl font-bold text-white mb-2">1. Personal Information</motion.h2>
              <div className="grid grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">First Name *</label>
                  <input type="text" placeholder="e.g. Ramesh" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:bg-gray-900 transition-colors outline-none"
                    value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Last Name *</label>
                  <input type="text" placeholder="e.g. Kumar" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:bg-gray-900 transition-colors outline-none"
                    value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} />
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Mobile Phone Number *</label>
                  <input type="tel" placeholder="e.g. 9876543210" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:bg-gray-900 transition-colors outline-none"
                    value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Email Address *</label>
                  <input type="email" placeholder="e.g. driver@moveon.com" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:bg-gray-900 transition-colors outline-none"
                    value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                </motion.div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <motion.div variants={itemVariants} className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 mb-1">City *</label>
                  <input type="text" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:bg-gray-900 transition-colors outline-none"
                    value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Pincode *</label>
                  <input type="text" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:bg-gray-900 transition-colors outline-none"
                    value={formData.pincode} onChange={e => handleInputChange('pincode', e.target.value)} />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Identity & Driving Licence */}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.h2 variants={itemVariants} className="text-xl font-bold text-white mb-2">2. Identity & Licence Upload</motion.h2>

              {/* Aadhaar */}
              <motion.div variants={itemVariants} className="p-4 bg-gray-950/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl space-y-3 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Aadhaar Card</span>
                  <span className="text-red-400 text-xs font-bold">ID + Photo required *</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">12-Digit Aadhaar Number *</label>
                  <input type="text" placeholder="e.g. 5491 8820 1920" className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    value={formData.aadhaarNumber} onChange={e => handleInputChange('aadhaarNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Upload Aadhaar Card Photo *</label>
                  <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                    formData.aadhaarUrl ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-700 hover:border-emerald-500/50 hover:bg-gray-900/50'
                  }`}>
                    <input type="file" accept="image/*" onChange={e => handleFileUpload('aadhaarUrl', e)} className="hidden" />
                    {formData.aadhaarUrl ? (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
                        <img src={formData.aadhaarUrl} alt="Aadhaar preview" className="w-14 h-10 object-cover rounded-lg border border-emerald-700 shadow-md" />
                        <span className="text-emerald-400 text-xs font-bold">✓ Aadhaar photo uploaded</span>
                      </motion.div>
                    ) : (
                      <span className="text-gray-500 text-xs flex items-center gap-2"><span className="text-lg">📷</span> Click to choose Aadhaar photo</span>
                    )}
                  </label>
                </div>
              </motion.div>

              {/* Driving Licence */}
              <motion.div variants={itemVariants} className="p-4 bg-gray-950/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl space-y-3 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Driving Licence</span>
                  <span className="text-red-400 text-xs font-bold">ID + Photo required *</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Driving Licence (DL) Number *</label>
                  <input type="text" placeholder="e.g. KA-03-20210019201" className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    value={formData.dlNumber} onChange={e => handleInputChange('dlNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Upload Driving Licence Photo *</label>
                  <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                    formData.dlUrl ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-700 hover:border-emerald-500/50 hover:bg-gray-900/50'
                  }`}>
                    <input type="file" accept="image/*" onChange={e => handleFileUpload('dlUrl', e)} className="hidden" />
                    {formData.dlUrl ? (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
                        <img src={formData.dlUrl} alt="DL preview" className="w-14 h-10 object-cover rounded-lg border border-emerald-700 shadow-md" />
                        <span className="text-emerald-400 text-xs font-bold">✓ Driving Licence photo uploaded</span>
                      </motion.div>
                    ) : (
                      <span className="text-gray-500 text-xs flex items-center gap-2"><span className="text-lg">📷</span> Click to choose Driving Licence photo</span>
                    )}
                  </label>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 3: Vehicle & RC */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.h2 variants={itemVariants} className="text-xl font-bold text-white mb-2">3. Vehicle & Registration (RC)</motion.h2>
              <div className="grid grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Vehicle Reg. Number *</label>
                  <input type="text" placeholder="e.g. KA-03-MR-9920" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    value={formData.vehicleNumber} onChange={e => handleInputChange('vehicleNumber', e.target.value)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Vehicle Category *</label>
                  <select className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    value={formData.category} onChange={e => handleInputChange('category', e.target.value)}>
                    <option value="SEDAN">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="MINI">Mini</option>
                    <option value="AUTO">Auto</option>
                    <option value="BIKE">Bike</option>
                  </select>
                </motion.div>
              </div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs font-bold text-gray-400 mb-1">Make / Model</label>
                <input type="text" placeholder="e.g. Maruti Suzuki Swift Dzire" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                  value={formData.make} onChange={e => handleInputChange('make', e.target.value)} />
              </motion.div>

              <motion.div variants={itemVariants} className="p-4 bg-gray-950/40 backdrop-blur-sm border border-gray-800/80 rounded-2xl space-y-3 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-orange-500/10 text-orange-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Vehicle RC</span>
                  <span className="text-red-400 text-xs font-bold">Photo required *</span>
                </div>
                <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                  formData.rcUrl ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-700 hover:border-emerald-500/50 hover:bg-gray-900/50'
                }`}>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload('rcUrl', e)} className="hidden" />
                  {formData.rcUrl ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
                      <img src={formData.rcUrl} alt="RC preview" className="w-14 h-10 object-cover rounded-lg border border-emerald-700 shadow-md" />
                      <span className="text-emerald-400 text-xs font-bold">✓ RC photo uploaded</span>
                    </motion.div>
                  ) : (
                    <span className="text-gray-500 text-xs flex items-center gap-2"><span className="text-lg">📷</span> Click to upload Vehicle RC photo</span>
                  )}
                </label>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 4: Bank Details & Confirmation */}
          {step === 4 && (
            <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <motion.h2 variants={itemVariants} className="text-xl font-bold text-white mb-2">4. Payouts & Final Confirmation</motion.h2>
              <div className="grid grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Bank Account Number</label>
                  <input type="text" placeholder="e.g. 987654321098" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    value={formData.accountNumber} onChange={e => handleInputChange('accountNumber', e.target.value)} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-gray-400 mb-1">IFSC Code</label>
                  <input type="text" placeholder="e.g. SBIN0001234" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                    value={formData.ifscCode} onChange={e => handleInputChange('ifscCode', e.target.value)} />
                </motion.div>
              </div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs font-bold text-gray-400 mb-1">UPI ID for Payouts</label>
                <input type="text" placeholder="e.g. ramesh@upi" className="w-full bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                  value={formData.upiId} onChange={e => handleInputChange('upiId', e.target.value)} />
              </motion.div>

              <motion.label variants={itemVariants} className="flex items-center gap-3 cursor-pointer pt-4 group">
                <div className="relative flex items-center justify-center w-6 h-6">
                  <input type="checkbox" checked={formData.agreementAccepted} onChange={e => handleInputChange('agreementAccepted', e.target.checked)}
                    className="peer w-5 h-5 rounded bg-gray-950 border-gray-700 text-emerald-500 focus:ring-0 outline-none transition-all cursor-pointer z-10 appearance-none checked:bg-emerald-500 checked:border-emerald-500" />
                  {formData.agreementAccepted && (
                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute w-3.5 h-3.5 text-white z-20 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">I agree to MoveON Driver Partner Terms & Safety Policies.</span>
              </motion.label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Navigation */}
        <motion.div 
          className="flex gap-3 mt-8 pt-6 border-t border-gray-800/60"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {step > 1 && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button" onClick={() => setStep(step - 1)}
              className="w-1/3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3.5 rounded-xl transition-all shadow-md"
            >
              ← Back
            </motion.button>
          )}
          <motion.button 
            whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)" } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            type="button" onClick={handleStepSubmit} disabled={loading}
            className={`font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
              step > 1 ? 'w-2/3' : 'w-full'
            } bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 disabled:opacity-70`}
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : step === 4 ? 'Complete Registration ✅' : 'Continue →'}
          </motion.button>
        </motion.div>

      </motion.div>
    </div>
  );
}
