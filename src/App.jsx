import React, { useState, useEffect } from 'react';
import {
  Plus,
  Download,
  ChevronLeft,
  FileText,
  Briefcase,
  Home as HomeIcon,
  Check,
  Trash2,
  ArrowRight,
  User,
  Shield,
  CreditCard,
  X,
  Loader2,
  Users,
  Award,
  BookOpen,
  Languages,
  Globe,
  Camera,
  Heart,
  Image as ImageIcon,
  ShoppingCart,
  Hash,
  Calendar,
  Clock,
  Sparkles,
  GripVertical,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import PaystackPop from '@paystack/inline-js';
import { supabase, PAYSTACK_PUBLIC_KEY } from './lib/supabase';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { generateCVContent } from './lib/ai';

const SECTIONS = [
  { id: 'cv', title: 'Professional CV', icon: Briefcase, color: '#6366f1', desc: 'Comprehensive professional resume' },
  { id: 'letter', title: 'Cover Letter', icon: FileText, color: '#ec4899', desc: 'Persuasive application' },
  { id: 'recommendation', title: 'Recommendation Letter', icon: Award, color: '#8b5cf6', desc: 'Professional endorsement letter' },
  { id: 'job_offer', title: 'Job Offer Letter', icon: Check, color: '#10b981', desc: 'Official employment offer' },
  { id: 'tenancy', title: 'Residential Tenancy', icon: HomeIcon, color: '#10b981', desc: 'Official Ghana Rent Act Compliant (2026)' },
  { id: 'shop_tenancy', title: 'Shop / Business Agreement', icon: CreditCard, color: '#f59e0b', desc: 'Commercial space, Container or Store' },
  { id: 'rent_receipt', title: 'Rent Receipt', icon: CreditCard, color: '#d946ef', desc: 'Proof of rent payment' },
  { id: 'invoice', title: 'Sales Receipt / Invoice', icon: FileText, color: '#6366f1', desc: 'Professional business receipts' },
  { id: 'leave_permission', title: 'Permission to be Absent', icon: FileText, color: '#8b5cf6', desc: 'Work/Duty leave request form' },
  { id: 'employment_contract', title: 'SME Employment Contract', icon: Briefcase, color: '#0ea5e9', desc: 'Standard SME labor agreement' },
  { id: 'qr_code', title: 'QR Code Generator', icon: Hash, color: '#f59e0b', desc: 'Custom QR codes for URLs, WiFi or text' },
];

const TEMPLATES = [
  { id: 'classic', name: 'Classic Professional', desc: 'Centered, clean, and traditionally professional.' },
  { id: 'modern', name: 'Modern Creative', desc: 'Left-aligned with bold section headers and accents.' },
  { id: 'minimal', name: 'Minimalist Compact', desc: 'Simple, efficient use of space with a streamlined look.' },
  { id: 'ghana', name: 'Ghana Official 2026', desc: 'Heritage style with legal watermarks and Rent Act sub-clauses.' },
];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#030712', textAlign: 'center', padding: '2rem' }}>
          <div className="card !p-12">
            <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Something caught an error.</h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>{this.state.error?.message || 'Unknown error'}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainContent />
    </ErrorBoundary>
  );
}

function MainContent() {
  const [view, setView] = useState('landing');
  const [selectedType, setSelectedType] = useState(null);
  const [data, setData] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [showPayment, setShowPayment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [docPrice, setDocPrice] = useState(() => Number(localStorage.getItem('spark_docs_price')) || 20);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [aiTone, setAiTone] = useState('professional');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('dark_mode') === 'true');
  const [showProfile, setShowProfile] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [typePrices, setTypePrices] = useState(() => {
    const saved = localStorage.getItem('spark_type_prices');
    return saved ? JSON.parse(saved) : {
      cv: 20,
      letter: 15,
      tenancy: 50,
      job_offer: 25,
      invoice: 10,
      recommendation: 20,
      leave_permission: 15,
      employment_contract: 40
    };
  });

  const getActivePrice = () => {
    return currentPrice || (selectedType && typePrices[selectedType.id]) || docPrice;
  };

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('dark_mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    // Session state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAdmin(true);
        localStorage.setItem('is_admin', 'true');
      } else {
        setIsAdmin(false);
        localStorage.removeItem('is_admin');
      }
    });

    // Initial check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAdmin(true);
      }
    };
    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const startDoc = (type) => {
    setSelectedType(type);
    setData(getInitialData(type.id));
    setCurrentDocId(null);
    setIsPaid(false);
    setCurrentPrice(null);
    setView('editor');
  };

  const handleAdminEdit = (doc) => {
    const type = SECTIONS.find(s => s.id === doc.type);
    setSelectedType(type);
    setData(doc.data);
    setCurrentDocId(doc.id);
    setIsPaid(doc.is_paid);
    setCurrentPrice(doc.price);
    setView('editor');
  };

  // Debounced Autosave Logic
  useEffect(() => {
    if (!selectedType || !data || Object.keys(data).length === 0) return;

    const timer = setTimeout(() => {
      saveToDatabase();
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [data, selectedTemplate]);

  const saveToDatabase = async () => {
    if (!selectedType || !data) return;
    try {
      setIsSaving(true);
      const docData = {
        type: selectedType.id,
        template: selectedTemplate,
        data: data,
        fullName: data.fullName || data.name || data.landlord || 'Untitled Document',
        email: data.email || 'anonymous@sparkdocs.com',
        is_paid: isPaid || isAdmin,
        price: getActivePrice()
      };

      if (currentDocId) {
        await supabase
          .from('documents')
          .update(docData)
          .eq('id', currentDocId);
      } else {
        const { data: inserted, error } = await supabase
          .from('documents')
          .insert([docData])
          .select();

        if (inserted && !error) {
          setCurrentDocId(inserted[0].id);
        }
      }
    } catch (err) {
      console.error('Autosave/Manual Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadClick = async () => {
    await saveToDatabase();
    if (isAdmin || isPaid) {
      await generatePDF();
    } else {
      setShowPayment(true);
    }
  };

  const handlePayment = () => {
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: data.email || 'user@example.com',
      amount: getActivePrice() * 100,
      currency: 'GHS',
      onSuccess: async (transaction) => {
        setIsPaid(true);
        setShowPayment(false);
        if (currentDocId) {
          await supabase.from('documents').update({ is_paid: true }).eq('id', currentDocId);
        }
        generatePDF();
      },
      onCancel: () => alert('Payment cancelled')
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    let y = 30;

    const addText = (text, size, style = 'normal', color = '#000000', mb = 5, xOffset = margin) => {
      if (text === undefined || text === null) return;
      const stringText = String(text);
      if (stringText.trim() === '') return;

      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(color);
      const maxWidth = 210 - (xOffset + margin);
      const lines = doc.splitTextToSize(stringText, maxWidth);
      const lineHeightMm = (size * 1.15) / 2.83465;
      lines.forEach((line) => {
        if (y + lineHeightMm > 277) {
          doc.addPage();
          y = 20;
          doc.setFont('helvetica', style);
          doc.setFontSize(size);
          doc.setTextColor(color);
        }
        doc.text(line, xOffset, y);
        y += lineHeightMm;
      });
      y += mb;
    };

    const addPhoto = async (imgData, x, y, size = 30) => {
      if (!imgData) return;
      try {
        const img = new Image();
        img.src = imgData;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const zoom = data.photoZoom || 1;
        const posX = data.photoX || 50; // 0-100%
        const posY = data.photoY || 50; // 0-100%

        // Calculate source image dimensions and position for cropping
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        // Target size for the square output (in pixels, for canvas)
        const targetCanvasSize = 200; // A reasonable pixel size for the output square
        canvas.width = targetCanvasSize;
        canvas.height = targetCanvasSize;

        // Calculate scaled image dimensions
        const scaledWidth = imgWidth * zoom;
        const scaledHeight = imgHeight * zoom;

        // Determine source rectangle (sx, sy, sWidth, sHeight)
        // This simulates object-fit: cover and object-position
        let sx, sy, sWidth, sHeight;

        if (scaledWidth / targetCanvasSize < scaledHeight / targetCanvasSize) {
          // Image is taller than the target aspect ratio, crop top/bottom
          sWidth = imgWidth;
          sHeight = targetCanvasSize * (imgWidth / targetCanvasSize) / zoom; // Height needed from source to fill target
          sx = 0;
          sy = (imgHeight - sHeight) * (posY / 100);
        } else {
          // Image is wider than the target aspect ratio, crop left/right
          sHeight = imgHeight;
          sWidth = targetCanvasSize * (imgHeight / targetCanvasSize) / zoom; // Width needed from source to fill target
          sy = 0;
          sx = (imgWidth - sWidth) * (posX / 100);
        }

        // Ensure source coordinates are within bounds
        sx = Math.max(0, Math.min(sx, imgWidth - sWidth));
        sy = Math.max(0, Math.min(sy, imgHeight - sHeight));
        sWidth = Math.max(1, sWidth); // Ensure minimum width/height
        sHeight = Math.max(1, sHeight);

        // Draw the cropped and scaled image onto the canvas
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetCanvasSize, targetCanvasSize);

        const processedImgData = canvas.toDataURL('image/jpeg', 0.9); // Convert canvas to base64
        const format = processedImgData.split(';')[0].split('/')[1].toUpperCase();

        doc.addImage(processedImgData, format, x, y, size, size);
        return size + 5;
      } catch (e) {
        console.error("PDF Image Error:", e);
        return 0;
      }
    };

    const getProficiency = (text) => {
      const t = String(text || '').toLowerCase();
      if (t.includes('native') || t.includes('fluent') || t.includes('expert')) return 5;
      if (t.includes('advanced') || t.includes('professional')) return 4;
      if (t.includes('intermediate')) return 3;
      if (t.includes('basic') || t.includes('beginner') || t.includes('elementary')) return 2;
      return 3;
    };

    const drawProficiencyDots = (text, x, y, color = '#6366f1') => {
      const score = getProficiency(text);
      const dotRadius = 0.8;
      const dotGap = 2.5;
      for (let i = 1; i <= 5; i++) {
        doc.setFillColor(i <= score ? color : '#e2e8f0');
        doc.circle(x + (i - 1) * dotGap, y - 0.8, dotRadius, 'F');
      }
    };

    const addBulletedPDF = (text, size, color = '#1e293b', xOffset = margin) => {
      if (!text) return;
      const items = text.split(/[,\n•*]/).map(t => t.trim()).filter(Boolean);
      items.forEach(item => {
        addText(`• ${item}`, size, 'normal', color, 1.5, xOffset);
      });
      y += 2;
    };

    const addReferencesPDF = (refs, size, color = '#1e293b', xOffset = margin) => {
      if (!refs) return;
      if (!Array.isArray(refs)) {
        addBulletedPDF(refs, size, color, xOffset);
        return;
      }
      refs.forEach(ref => {
        if (!ref.name) return;
        addText(ref.name, size, 'bold', color, 1, xOffset);
        if (ref.org || ref.phone) {
          addText(`${ref.org}${ref.org && ref.phone ? ' | ' : ''}${ref.phone}`, size - 1, 'normal', '#64748b', 3, xOffset);
        }
      });
    };

    if (selectedType.id === 'cv') {
      if (selectedTemplate === 'modern') {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 210, 50, 'F');
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(1.5);
        doc.line(0, 50, 210, 50);
        y = 15;

        if (data.photo) {
          await addPhoto(data.photo, 20, 10, 30);
          addText(data.fullName, 24, 'bold', '#0f172a', 4, 55);
          addText(`${data.email} | ${data.phone}`, 9, 'normal', '#64748b', 15, 55);
        } else {
          addText(data.fullName, 24, 'bold', '#0f172a', 4);
          addText(`${data.email} | ${data.phone} | ${data.address}`, 9, 'normal', '#64748b', 15);
        }

        y = 60;

        const mid = 130;
        const leftCol = 20;
        const rightCol = 140;

        // Main Column
        let savedY = y;
        addText('SUMMARY', 10, 'bold', '#6366f1', 4, leftCol);
        addText(data.summary, 10, 'normal', '#1e293b', 8, leftCol);

        addText('EXPERIENCE', 10, 'bold', '#6366f1', 6, leftCol);
        data.experience?.forEach(exp => {
          if (!exp.title) return;
          addText(exp.title, 11, 'bold', '#0f172a', 1, leftCol);
          addText(`${exp.company} | ${exp.dates}`, 9, 'italic', '#64748b', 2, leftCol);
          addBulletedPDF(exp.tasks, 9, '#1e293b', leftCol);
          if (exp.achievement) addText(`Achievement: ${exp.achievement}`, 8, 'bold', '#1e293b', 4, leftCol);
        });

        // Sidebar logic (using fixed X)
        y = savedY;
        const sidebarX = 145;
        addText('EDUCATION', 10, 'bold', '#6366f1', 4, sidebarX);
        data.education?.forEach(edu => {
          addText(edu.degree, 9, 'bold', '#0f172a', 1, sidebarX);
          addText(edu.school, 8, 'normal', '#64748b', 3, sidebarX);
        });

        addText('SKILLS', 10, 'bold', '#6366f1', 4, sidebarX);
        addText(`Tech: ${data.techSkills}`, 8, 'normal', '#1e293b', 2, sidebarX);
        addText(`Soft: ${data.softSkills}`, 8, 'normal', '#1e293b', 2, sidebarX);

        addText('LANGUAGES', 10, 'bold', '#6366f1', 4, sidebarX);
        data.languages?.split(/[,\n]/).forEach(lang => {
          addText(lang.trim(), 8, 'normal', '#1e293b', 1, sidebarX);
          drawProficiencyDots(lang, sidebarX + 35, y);
          y += 3;
        });

        addText('INTERESTS', 10, 'bold', '#6366f1', 4, sidebarX);
        addBulletedPDF(data.hobbies, 8, '#1e293b', sidebarX);

        addText('REFERENCES', 10, 'bold', '#6366f1', 4, sidebarX);
        addReferencesPDF(data.references, 8, '#1e293b', sidebarX);

      } else if (selectedTemplate === 'minimal') {
        y = 25;
        if (data.photo) {
          await addPhoto(data.photo, 160, 15, 25); // Adjusted position for minimal template
        }
        addText(data.fullName, 22, 'normal', '#111827', 4);
        addText(`${data.email} • ${data.phone} • ${data.address}`, 9, 'normal', '#64748b', 15);

        const minimalSection = async (title, content, items = []) => { // Made async
          const labelX = 20;
          const contentX = 50;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor('#94a3b8');
          doc.text(title.toUpperCase(), labelX, y + 3);

          if (content) addText(content, 9, 'normal', '#1e293b', 6, contentX);
          items.forEach(item => {
            addText(item.heading, 10, 'bold', '#111827', 1, contentX);
            if (item.sub) addText(item.sub, 8, 'normal', '#64748b', 2, contentX);
            if (item.desc) addText(item.desc, 9, 'normal', '#1e293b', 4, contentX);
          });
          y += 5;
        };

        await minimalSection('Profile', data.summary);
        await minimalSection('Experience', null, []);
        const expX = 50;
        data.experience?.forEach(exp => {
          addText(exp.title, 10, 'bold', '#111827', 1, expX);
          addText(`${exp.company} (${exp.dates})`, 8, 'normal', '#64748b', 2, expX);
          addBulletedPDF(exp.tasks, 9, '#1e293b', expX);
          y += 2;
        });

        await minimalSection('Education', null, data.education?.map(e => ({ heading: e.degree, sub: e.school })));
        await minimalSection('Skills', `${data.techSkills}, ${data.softSkills}`);

        // Languages with dots in Minimal
        await minimalSection('Languages', null);
        data.languages?.split(/[,\n]/).forEach(lang => {
          addText(lang.trim(), 8, 'normal', '#1e293b', 0, 50);
          drawProficiencyDots(lang, 50 + 40, y, '#94a3b8');
          y += 4;
        });

        await minimalSection('Interests', null);
        addBulletedPDF(data.hobbies, 9, '#1e293b', 50);

        await minimalSection('References', null);
        addReferencesPDF(data.references, 9, '#1e293b', 50);

      } else {
        // Classic layout
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        const nameWidth = doc.getTextWidth(data.fullName);
        doc.text(data.fullName, (210 - nameWidth) / 2, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#64748b');
        const contact = `${data.address} | ${data.phone} | ${data.email}`;
        const contactWidth = doc.getTextWidth(contact);
        doc.text(contact, (210 - contactWidth) / 2, y);
        y += 12;

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 10;

        if (data.photo) {
          await addPhoto(data.photo, 160, 10, 25);
        }

        addText('PROFESSIONAL SUMMARY', 12, 'bold', '#6366f1', 4);
        addText(data.summary, 10, 'normal', '#1e293b', 8);

        addText('WORK EXPERIENCE', 12, 'bold', '#6366f1', 6);
        data.experience?.forEach(exp => {
          if (!exp.title) return;
          addText(exp.title, 11, 'bold', '#1e293b', 1);
          addText(`${exp.company} | ${exp.dates}`, 9, 'italic', '#64748b', 2);
          addBulletedPDF(exp.tasks, 10);
          if (exp.achievement) addText(`Achievement: ${exp.achievement}`, 9, 'bold', '#1e293b', 4);
        });

        addText('EDUCATION & TRAINING', 12, 'bold', '#6366f1', 6);
        data.education?.forEach(edu => {
          if (!edu.degree) return;
          addText(edu.degree, 11, 'bold', '#1e293b', 1);
          addText(`${edu.school} (${edu.dates})`, 10, 'normal', '#1e293b', 4);
        });

        addText('SKILLS', 12, 'bold', '#6366f1', 4);
        addText(`Technical: ${data.techSkills}`, 10, 'normal', '#1e293b', 2);
        addText(`Soft Skills: ${data.softSkills}`, 10, 'normal', '#1e293b', 8);

        addText('LANGUAGES', 12, 'bold', '#6366f1', 4);
        data.languages?.split(/[,\n]/).forEach(lang => {
          addText(lang.trim(), 10, 'normal', '#1e293b', 1);
          drawProficiencyDots(lang, margin + 45, y);
          y += 4;
        });

        if (data.leadership?.length > 0) {
          addText('LEADERSHIP & VOLUNTEERING', 12, 'bold', '#6366f1', 6);
          data.leadership.forEach(l => {
            if (!l.role) return;
            addText(l.role, 11, 'bold', '#1e293b', 1);
            addText(`${l.org}`, 10, 'italic', '#64748b', 2);
            addText(l.achievement, 9, 'normal', '#1e293b', 4);
          });
        }

        if (data.hobbies || data.references) {
          doc.line(margin, y, 190, y); y += 10;
          addText('INTERESTS', 11, 'bold', '#6366f1', 4);
          addBulletedPDF(data.hobbies, 10);
          addText('REFERENCES', 11, 'bold', '#6366f1', 4);
          addReferencesPDF(data.references, 10);
        }
      }
    } else if (selectedType.id === 'letter') {
      const isMinimal = selectedTemplate === 'minimal';
      const isModern = selectedTemplate === 'modern';

      if (isModern) {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 210, 50, 'F');
        doc.setDrawColor('#6366f1');
        doc.setLineWidth(1.5);
        doc.line(margin, 50, 190, 50);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.setTextColor('#1e293b');
        doc.text(data.senderName?.toUpperCase() || 'SENDER NAME', margin, 35);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#64748b');
        doc.text(`${data.senderEmail} | ${data.senderPhone} | ${data.senderAddress}`, margin, 43);
        y = 70;
      } else if (isMinimal) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(22);
        doc.setTextColor('#111827');
        doc.text(data.senderName || '', margin, 30);
        doc.setFontSize(9);
        doc.setTextColor('#64748b');
        doc.text(`${data.senderEmail} • ${data.senderPhone} • ${data.senderAddress}`, margin, 38);
        y = 60;
      } else {
        // Classic
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(data.senderName || '', 190, 30, { align: 'right' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(data.senderAddress || '', 190, 36, { align: 'right' });
        doc.text(data.senderPhone || '', 190, 42, { align: 'right' });
        doc.text(data.senderEmail || '', 190, 48, { align: 'right' });
        y = 65;
      }

      addText(data.date || new Date().toLocaleDateString('en-GB'), 10, 'normal', '#64748b', 12);

      addText('TO:', 9, 'bold', '#64748b', 2);
      addText(data.recipient || 'Recipient Name', 11, 'bold', '#1e293b', 1);
      if (data.recipientTitle) addText(data.recipientTitle, 10, 'italic', '#64748b', 1);
      addText(data.company || 'Company Name', 10, 'normal', '#1e293b', 1);
      addText(data.companyAddress || '', 10, 'normal', '#64748b', 15);

      if (data.subject) {
        addText(`RE: ${data.subject.toUpperCase()}`, 11, 'bold', '#1e293b', 12);
      }

      const bodyLines = doc.splitTextToSize(data.body, 170);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor('#334155');
      doc.text(bodyLines, margin, y);
      y += (bodyLines.length * 7) + 20;

      addText('Sincerely,', 11);
      y += 15;
      doc.setDrawColor('#000');
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + 50, y);
      y += 5;
      addText(data.senderName, 11, 'bold');
    } else if (selectedType.id === 'recommendation') {
      addText('LETTER OF RECOMMENDATION', 18, 'bold', '#8b5cf6', 15);
      addText(`Date: ${new Date().toLocaleDateString('en-GB')}`, 10, 'normal', '#64748b', 10);
      addText('To Whom It May Concern,', 10, 'bold', '#1e293b', 10);
      addText(data.body, 11, 'normal', '#1e293b', 15);
      y += 20;
      addText('Sincerely,', 11);
      y += 10;
      doc.line(margin, y, margin + 60, y); y += 5;
      addText(data.recommenderName, 11, 'bold');
      addText(`${data.recommenderTitle} | ${data.recommenderOrg}`, 10);
    } else if (selectedType.id === 'qr_code') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor('#f59e0b');
      doc.text(data.label?.toUpperCase() || 'QR CODE', 105, 40, { align: 'center' });

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.content || '')}`;
      try {
        doc.addImage(qrUrl, 'PNG', 55, 60, 100, 100);
      } catch (e) {
        addText("Failed to embed QR code image.", 10, 'italic', '#ef4444', 10, 105);
      }

      y = 180;
      addText(data.content || '', 10, 'normal', '#64748b', 10, 105);
      addText("Generated via SPARK DOCS", 8, 'bold', '#94a3b8', 10, 105);
    } else if (selectedType.id === 'job_offer') {
      addText('JOB OFFER LETTER', 20, 'bold', '#10b981', 4);
      addText(data.companyName, 12, 'bold', '#64748b', 15);

      addText(`Dear ${data.candidateName},`, 11, 'bold', '#1e293b', 8);
      addText(`We are pleased to offer you the position of ${data.jobTitle} at ${data.companyName}.`, 11);

      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, 170, 25, 'F');
      y += 10;
      addText(`Start Date: ${data.startDate}`, 10, 'bold', '#1e293b', 2, margin + 5);
      addText(`Salary: GHS ${data.salary}`, 10, 'bold', '#1e293b', 5, margin + 5);
      y += 10;

      addText(data.welcomeMessage, 11, 'normal', '#1e293b', 15);
      y += 20;
      addText('Signed by,', 10);
      addText(data.managerName, 12, 'bold');
      addText('Hiring Manager', 10);
    } else if (selectedType.id === 'rent_receipt') {
      doc.setDrawColor('#d946ef');
      doc.setLineWidth(1);
      doc.rect(margin - 5, 20, 180, 120);

      addText('OFFICIAL RENT RECEIPT', 18, 'bold', '#d946ef', 15, 105);
      addText(`No: ${data.receiptNo} | Date: ${data.date}`, 10, 'bold', '#64748b', 15, 105);

      addText(`Received from ${data.tenantName}, the sum of GHS ${data.amount}.`, 12, 'normal', '#1e293b', 10);
      addText(`Being rent payment for the period: ${data.period}.`, 11);
      addText(`Payment Method: ${data.method}`, 11, 'normal', '#1e293b', 20);

      y += 20;
      doc.line(130, y, 185, y);
      doc.text(data.landlordName, 130, y + 5);
      doc.text('Landlord Signature', 130, y + 10);
    } else if (selectedType.id === 'tenancy' || selectedType.id === 'shop_tenancy') {
      const isGhana = selectedTemplate === 'ghana';
      const title = selectedType.id === 'shop_tenancy' ? 'COMMERCIAL AGREEMENT' : 'TENANCY AGREEMENT';
      const isShop = selectedType.id === 'shop_tenancy';
      const accentColor = isGhana ? (isShop ? '#d97706' : '#059669') : '#000000';

      if (isGhana) {
        // Add Watermark
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.05 }));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(40);
        doc.setTextColor('#000000');
        doc.text(isShop ? 'OFFICIAL COMMERCIAL AGREEMENT' : 'OFFICIAL TENANCY AGREEMENT', 105, 150, { align: 'center', angle: 45 });
        doc.setFontSize(20);
        doc.text('RENT CONTROL DEPARTMENT GHANA', 105, 170, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();

        // Header
        const headerBg = isShop ? [255, 251, 235] : [240, 253, 244];
        doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(accentColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(title, 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text('GHANA RENT ACT COMPLIANT (2026)', 105, 28, { align: 'center' });
        y = 50;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, 105, 25, { align: 'center' });
        y = 40;
      }

      const labelColor = accentColor;

      addText(`DATED: ${data.agreementDate}`, 10, 'bold', '#64748b', 10, 105);

      addText('PARTIES TO THE AGREEMENT', 11, 'bold', labelColor, 5);
      addText(`This agreement is made on ${data.agreementDate} between:`, 10);

      addText('LANDLORD:', 10, 'bold', '#000000', 1, margin + 5);
      addText(`${data.landlordName}\nAddress: ${data.landlordAddress}\nPhone: ${data.landlordPhone}`, 10, 'normal', '#1e293b', 5, margin + 5);

      addText('TENANT:', 10, 'bold', '#000000', 1, margin + 5);
      const tenantInfo = data.businessName
        ? `${data.tenantName}\nBusiness: ${data.businessName}\nID: ${data.tenantIdType} - ${data.tenantIdNumber}\nPhone: ${data.tenantPhone}`
        : `${data.tenantName}\nID: ${data.tenantIdType} - ${data.tenantIdNumber}\nPhone: ${data.tenantPhone}`;
      addText(tenantInfo, 10, 'normal', '#1e293b', 8, margin + 5);

      if (isShop) {
        y += 2;
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.5);
        doc.line(margin + 5, y, margin + 60, y);
        y += 5;
      }

      addText('1. ARTICLE OF AGREEMENT', 11, 'bold', labelColor, 3);
      addText(`The Landlord agrees to let and the Tenant agrees to take the premises situated at ${data.propertyAddress} (${data.propertyDescription}).`, 10, 'normal', '#1e293b', 8);

      addText('2. TERM & RENT', 11, 'bold', labelColor, 3);
      addText(`The tenancy shall be for a duration of ${data.termDuration} commencing on ${data.startDate} and ending on ${data.endDate}.`, 10);
      addText(`Rent Amount: GHS ${data.rentAmount} payable ${data.paymentFrequency}.`, 10);
      addText(`Advance Payment: GHS ${data.advancePayment} | Security Deposit: GHS ${data.securityDeposit}`, 10, 'normal', '#1e293b', 8);

      addText('3. UTILITIES & SERVICES', 11, 'bold', labelColor, 3);
      addText(data.utilities, 10, 'normal', '#1e293b', 8);

      addText('4. SPECIAL CONDITIONS', 11, 'bold', labelColor, 3);
      addText(data.otherTerms, 10, 'normal', '#1e293b', 15);

      // Signatures
      y += 10;
      if (y > 250) { doc.addPage(); y = 20; }

      doc.line(margin, y, margin + 70, y);
      doc.line(120, y, 120 + 70, y);

      doc.setFontSize(9);
      doc.text('LANDLORD SIGNATURE', margin, y + 5);
      doc.text('TENANT SIGNATURE', 120, y + 5);
      doc.text(data.landlordName, margin, y + 10);
      doc.text(data.tenantName, 120, y + 10);

      y += 25;
      addText('WITNESSES:', 10, 'bold', '#000000', 5);

      const startY = y;
      addText(`1. ${data.witness1Name} (Landlord Side)`, 9, 'normal', '#1e293b', 2, margin + 5);
      addText(`Phone: ${data.witness1Phone} | Address: ${data.witness1Address}`, 9, 'normal', '#64748b', 5, margin + 5);

      y = startY;
      addText(`2. ${data.witness2Name} (Tenant Side)`, 9, 'normal', '#1e293b', 2, 120);
      addText(`Phone: ${data.witness2Phone} | Address: ${data.witness2Address}`, 9, 'normal', '#64748b', 10, 120);

      if (isGhana) {
        doc.setFontSize(8);
        doc.setTextColor('#94a3b8');
        doc.text('This document is generated via SPARK DOCS and must be registered with the Rent Control Department.', 105, 285, { align: 'center' });
      }
    } else if (selectedType.id === 'invoice') {
      if (data.showWatermark) {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.05 }));
        if (data.watermarkType === 'logo' && data.businessLogo) {
          try {
            doc.addImage(data.businessLogo, 'JPEG', 50, 100, 110, 110, undefined, 'FAST');
          } catch (e) {
            console.error("Watermark Logo Error:", e);
          }
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(50);
          doc.setTextColor('#000000');
          doc.text(data.businessName || 'INVOICE', 105, 150, { align: 'center', angle: 45 });
        }
        doc.restoreGraphicsState();
      }

      if (data.businessLogo) {
        try {
          doc.addImage(data.businessLogo, 'JPEG', margin, 20, 25, 25);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(24);
          doc.setTextColor('#6366f1');
          doc.text(data.businessName || 'INVOICE', margin + 30, 30);

          doc.setTextColor('#1e293b');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`TIN: ${data.businessTin || 'N/A'}`, margin + 30, 38);
          doc.text(data.businessAddress || '', margin + 30, 43);
          doc.text(`${data.businessPhone} | ${data.businessEmail}`, margin + 30, 48);
        } catch (e) {
          console.error("Logo Error:", e);
          // Fallback to text if logo fails
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(24);
          doc.setTextColor('#6366f1');
          doc.text(data.businessName || 'INVOICE', margin, 30);
          // ... rest of header ...
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor('#6366f1');
        doc.text(data.businessName || 'INVOICE', margin, 30);

        doc.setTextColor('#1e293b');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`TIN: ${data.businessTin || 'N/A'}`, margin, 38);
        doc.text(data.businessAddress || '', margin, 43);
        doc.text(`${data.businessPhone} | ${data.businessEmail}`, margin, 48);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor('#1e293b');
      doc.text('INVOICE', 160, 30, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`# ${data.invoiceNumber}`, 160, 38, { align: 'right' });
      doc.text(`Date: ${data.date}`, 160, 43, { align: 'right' });

      y = 70;
      addText('BILL TO:', 9, 'bold', '#64748b', 2);
      addText(data.customerName, 11, 'bold', '#1e293b', 2);
      addText(data.customerAddress, 10, 'normal', '#64748b', 2);
      addText(data.customerPhone, 10, 'normal', '#64748b', 10);

      // Table Header
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 190 - margin, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', margin + 5, y + 7);
      doc.text('QTY', 120, y + 7, { align: 'center' });
      doc.text('UNIT', 145, y + 7, { align: 'right' });
      doc.text('AMOUNT', 185, y + 7, { align: 'right' });

      y += 15;
      doc.setFont('helvetica', 'normal');
      data.items?.forEach(item => {
        const q = parseFloat(item.qty);
        const p = parseFloat(item.price);
        const isQNumeric = !isNaN(q) && item.qty !== '' && item.qty !== null && item.qty !== 'N/A';
        const isPNumeric = !isNaN(p) && item.price !== '' && item.price !== null && item.price !== 'N/A';

        const lineAmt = isQNumeric && isPNumeric ? q * p : (isPNumeric ? p : 0);
        const displayQty = isQNumeric ? String(item.qty) : 'N/A';
        const displayPrice = isPNumeric ? p.toFixed(2) : 'N/A';

        doc.text(item.desc, margin + 5, y);
        doc.text(displayQty, 120, y, { align: 'center' });
        doc.text(displayPrice, 145, y, { align: 'right' });
        doc.text(lineAmt.toFixed(2), 185, y, { align: 'right' });
        y += 8;
      });

      y += 10;
      const subtotal = data.items?.reduce((sum, item) => {
        const q = parseFloat(item.qty);
        const p = parseFloat(item.price);
        const isQNumeric = !isNaN(q) && item.qty !== '' && item.qty !== null && item.qty !== 'N/A';
        const isPNumeric = !isNaN(p) && item.price !== '' && item.price !== null && item.price !== 'N/A';
        return sum + (isQNumeric && isPNumeric ? q * p : (isPNumeric ? p : 0));
      }, 0) || 0;
      const tax = subtotal * (data.taxRate / 100);
      const total = subtotal + tax;

      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', 150, y, { align: 'right' });
      doc.text(`GHS ${subtotal.toFixed(2)}`, 185, y, { align: 'right' });
      y += 6;
      doc.text(`Tax (${data.taxRate}%):`, 150, y, { align: 'right' });
      doc.text(`GHS ${tax.toFixed(2)}`, 185, y, { align: 'right' });
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor('#6366f1');
      doc.text('Total:', 150, y, { align: 'right' });
      doc.text(`GHS ${total.toFixed(2)}`, 185, y, { align: 'right' });

      y += 20;
      doc.setFontSize(9);
      doc.setTextColor('#64748b');
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(data.notes, margin, y, { maxWidth: 100 });
    } else if (selectedType.id === 'leave_permission') {
      // Company Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor('#8b5cf6');
      doc.text(data.companyName || 'COMPANY NAME', margin, 25);

      doc.setFontSize(9);
      doc.setTextColor('#64748b');
      doc.setFont('helvetica', 'normal');
      doc.text(data.companyAddress || '', margin, 32);
      doc.text(data.companyPhone || '', margin, 37);

      // Title
      doc.setFontSize(14);
      doc.setTextColor('#1e293b');
      doc.setFont('helvetica', 'bold');
      doc.text('LEAVE REQUEST', 200 - margin, 25, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor('#8b5cf6');
      doc.text('Permission to be Absent', 200 - margin, 30, { align: 'right' });

      doc.setDrawColor('#8b5cf6');
      doc.setLineWidth(0.5);
      doc.line(margin, 42, 210 - margin, 42);

      y = 55;
      doc.setTextColor('#1e293b');
      addText('EMPLOYEE DETAILS', 9, 'bold', '#64748b', 2);
      addText(`Name: ${data.employeeName}`, 10, 'bold', '#1e293b', 2);
      addText(`Employee ID: ${data.employeeId}`, 10, 'normal', '#1e293b', 2);
      addText(`Department: ${data.department}`, 10, 'normal', '#1e293b', 2);
      addText(`Position: ${data.position}`, 10, 'normal', '#1e293b', 10);

      addText('ABSENCE PARTICULARS', 9, 'bold', '#64748b', 2);
      addText(`Period: ${data.startDate} to ${data.endDate} (${data.totalDays} Days)`, 10, 'normal', '#1e293b', 5);
      addText('Reason:', 10, 'bold', '#1e293b', 2);
      addText(data.reason, 10, 'normal', '#475569', 10, margin, { maxWidth: 170 });
      addText(`Emergency Contact: ${data.contactWhileAbsent}`, 10, 'normal', '#1e293b', 15);

      y = Math.max(y, 180);
      doc.line(margin, y, margin + 70, y);
      doc.line(120, y, 120 + 70, y);
      doc.text('Employee Signature', margin, y + 5);
      doc.text(`Manager Approval (${data.managerName})`, 120, y + 5);
      doc.text(`Date: ${data.requestDate}`, margin, y + 10);
      doc.text('Date: _______________', 120, y + 10);

    } else if (selectedType.id === 'employment_contract') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor('#0ea5e9');
      doc.text('EMPLOYMENT CONTRACT', 105, 30, { align: 'center' });

      y = 50;
      doc.setFontSize(10);
      doc.setTextColor('#1e293b');
      doc.setFont('helvetica', 'normal');
      doc.text(`This contract is made on ${data.contractDate} between:`, margin, y);
      y += 10;
      addText('EMPLOYER:', 9, 'bold', '#0ea5e9', 2);
      addText(data.employerName, 11, 'bold', '#1e293b', 2);
      addText(data.employerAddress, 10, 'normal', '#64748b', 10);

      addText('EMPLOYEE:', 9, 'bold', '#0ea5e9', 2);
      addText(data.employeeName, 11, 'bold', '#1e293b', 2);
      addText(`ID: ${data.employeeIdNumber} (${data.employeeIdType})`, 10, 'normal', '#1e293b', 2);
      addText(data.employeeAddress, 10, 'normal', '#64748b', 10);

      addText('1. APPOINTMENT', 10, 'bold', '#0ea5e9', 2);
      addText(`Role: ${data.jobTitle} | Dept: ${data.department}`, 10, 'normal', '#1e293b', 8);

      addText('2. TERMS', 10, 'bold', '#0ea5e9', 2);
      addText(`Start Date: ${data.commencementDate} | Probation: ${data.probationPeriod}`, 10, 'normal', '#1e293b', 5);
      addText(`Salary: GHS ${data.salaryAmount} | Hours: ${data.workingHours}`, 10, 'normal', '#1e293b', 5);
      addText(`Annual Leave: ${data.annualLeave} | Notice: ${data.noticePeriod}`, 10, 'normal', '#1e293b', 15);

      y = Math.max(y, 220);
      doc.line(margin, y, margin + 70, y);
      doc.line(120, y, 120 + 70, y);
      doc.text('For Employer', margin, y + 5);
      doc.text('The Employee', 120, y + 5);
      doc.text(data.employerName, margin, y + 10);
      doc.text(data.employeeName, 120, y + 10);
    } else {
      addText(selectedType.title, 20, 'bold', '#000000', 15);
      Object.entries(data).forEach(([key, val]) => {
        addText(`${key.toUpperCase().replace(/([A-Z])/g, ' $1')}:`, 10, 'bold');
        addText(val, 10, 'normal', '#000000', 10);
      });
    }

    const getFileName = () => {
      const getFirstName = (name) => String(name || '').split(' ')[0] || 'Document';
      const type = selectedType.id;

      if (type === 'cv' || type === 'letter') {
        return `${getFirstName(data.fullName || data.senderName)}_${type === 'cv' ? 'CV' : 'Cover_Letter'}.pdf`;
      }
      if (type === 'rent_receipt') {
        return `${(data.landlordName || 'Receipt').replace(/\s+/g, '_')}_Rent_Receipt.pdf`;
      }
      if (type === 'invoice') {
        return `${(data.businessName || 'Invoice').replace(/\s+/g, '_')}_Invoice.pdf`;
      }
      if (type === 'recommendation') {
        return `Recommendation_for_${getFirstName(data.candidateName)}.pdf`;
      }
      if (type === 'job_offer') {
        return `Job_Offer_${getFirstName(data.candidateName)}.pdf`;
      }
      if (type === 'tenancy' || type === 'shop_tenancy') {
        return `${getFirstName(data.tenantName)}_Tenancy_Agreement.pdf`;
      }
      if (type === 'leave_permission') {
        return `Leave_Request_${getFirstName(data.employeeName)}.pdf`;
      }
      if (type === 'employment_contract') {
        return `Employment_Contract_${getFirstName(data.employeeName)}.pdf`;
      }

      return `${selectedType.id}_${Date.now()}.pdf`;
    };

    doc.save(getFileName());
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <LandingPage key="landing" onStart={startDoc} onAdmin={() => setView(isAdmin ? 'admin' : 'admin_login')} onProfile={() => setShowProfile(true)} darkMode={darkMode} setDarkMode={setDarkMode} />
        ) : view === 'admin' ? (
          <AdminDashboard
            key="admin"
            onEdit={handleAdminEdit}
            onBack={() => setView('landing')}
            currentPrice={docPrice}
            onPriceChange={(p) => { setDocPrice(p); localStorage.setItem('spark_docs_price', p); }}
            typePrices={typePrices}
            onTypePriceChange={(type, p) => {
              const newPrices = { ...typePrices, [type]: p };
              setTypePrices(newPrices);
              localStorage.setItem('spark_type_prices', JSON.stringify(newPrices));
            }}
            onLogout={async () => { await supabase.auth.signOut(); setView('landing'); }}
          />
        ) : view === 'admin_login' ? (
          <AdminLogin key="login" onLogin={() => setView('admin')} onBack={() => setView('landing')} />
        ) : (
          <EditorPage
            key="editor"
            type={selectedType}
            data={data}
            setData={setData}
            template={selectedTemplate}
            setTemplate={setSelectedTemplate}
            onBack={() => setView(isAdmin ? 'admin' : 'landing')}
            onDownload={handleDownloadClick}
            onSave={saveToDatabase}
            isAdmin={isAdmin}
            isSaving={isSaving}
            aiTone={aiTone}
            setAiTone={setAiTone}
            isPaid={isPaid}
          />
        )}
      </AnimatePresence>

      {showProfile && (
        <div className="overlay fade-in">
          <ProfileModal onClose={() => setShowProfile(false)} />
        </div>
      )}

      {showPayment && (
        <div className="overlay">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal text-center"
          >
            <div className="flex justify-end absolute top-6 right-6">
              <button onClick={() => setShowPayment(false)} className="text-text-muted hover:text-primary transition-colors">
                <X size={24} />
              </button>
            </div>

            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-inner"
            >
              <CreditCard size={48} />
            </motion.div>

            <h2 className="text-3xl font-bold mb-3 tracking-tight">Generate Final PDF</h2>
            <p className="text-text-muted mb-10 leading-relaxed px-4">
              Your professional document is ready. Gain full access and download in high-quality PDF for only <span className="text-primary font-bold">GH₵{getActivePrice()}</span>.
            </p>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePayment}
                className="btn btn-primary w-full !py-5 text-lg shadow-xl"
              >
                Unlock Document Now
              </motion.button>
              <button
                onClick={() => setShowPayment(false)}
                className="btn btn-ghost w-full !border-none !text-text-muted hover:!text-primary"
              >
                Maybe Later
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-card-border flex items-center justify-center gap-6 opacity-40">
              <Shield size={20} />
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Secure Payment by Paystack</span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function LandingPage({ onStart, onAdmin, onProfile, darkMode, setDarkMode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="container px-4 md:px-6">
      <header className="header" style={{ border: 'none', background: 'transparent' }}>
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="brand"
          style={{ fontSize: '1.8rem', fontWeight: 800 }}
        >
          SPARK<span style={{ color: 'var(--primary)' }}>DOCS</span>
        </motion.div>
        <div className="flex items-center gap-2 ml-auto">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setDarkMode(!darkMode)}
            className="btn btn-ghost !p-2 rounded-full"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sparkles size={18} /> : <FileText size={18} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onProfile}
            className="btn btn-ghost !p-2 rounded-full"
            title="My Profile"
          >
            <User size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onAdmin}
            className="btn btn-ghost !p-2 rounded-full"
            title="Admin Access"
          >
            <Shield size={20} />
          </motion.button>
        </div>
      </header>

      <section className="hero">
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          Professional documents <br className="hidden md:block" />
          that get <span style={{ color: 'var(--primary)' }}>results.</span>
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Create stunning CVs, application letters, and legal agreements in minutes with our AI-powered editor.
        </motion.p>
      </section>

      <motion.div
        className="grid"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
        {SECTIONS.map((item) => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { y: 20, opacity: 0 },
              show: { y: 0, opacity: 1 }
            }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            className="card group cursor-pointer"
            onClick={() => onStart(item)}
          >
            <div className="flex items-start justify-between mb-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `${item.color}15` }}
              >
                <item.icon color={item.color} size={24} />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={20} className="text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
            <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <footer className="py-20 text-center border-t border-card-border mt-20 opacity-60 hover:opacity-100 transition-opacity">
        <p className="text-sm">© 2026 SPARK DOCS. Crafted for professionals.</p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="#" className="text-xs hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="text-xs hover:text-primary transition-colors">Terms of Service</a>
          <button
            onClick={() => { localStorage.setItem('is_admin', 'true'); window.location.reload(); }}
            className="text-xs opacity-10 hover:opacity-100 transition-opacity"
          >
            Admin Bypass
          </button>
        </div>
      </footer>
    </motion.div>
  );
}

function EditorPage({ type, data, setData, template, setTemplate, onBack, onDownload, onSave, isAdmin, isSaving, aiTone, setAiTone, isPaid }) {
  const [activeTab, setActiveTab] = useState('edit'); // 'edit', 'preview'
  const [docScale, setDocScale] = useState(1);
  const [lastSaved, setLastSaved] = useState(null);
  const [showAiNotice, setShowAiNotice] = useState(false);

  useEffect(() => {
    if (!isSaving) setLastSaved(new Date().toLocaleTimeString());
  }, [isSaving]);
  useEffect(() => {
    if (showAiNotice) {
      const timer = setTimeout(() => setShowAiNotice(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showAiNotice]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        const panWidth = window.innerWidth - (window.innerWidth < 768 ? 32 : 64);
        const pixelWidth = 210 * 3.78;
        setDocScale(Math.min(panWidth / pixelWidth, 1));
      } else {
        setDocScale(0.85); // Professional scale for desktop view
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Security Logic: Disable Right-Click and Copying for Unpaid Users
  useEffect(() => {
    if (isPaid || isAdmin) return;

    const handleContextMenu = (e) => {
      if (e.target.closest('.document-page')) {
        e.preventDefault();
        alert('Please pay to unlock the full document.');
      }
    };

    const handleKeyDown = (e) => {
      // Prevent Ctrl+P, Ctrl+S, Ctrl+C
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'c' || e.key === 'u')) {
        if (activeTab === 'preview') {
          e.preventDefault();
          alert('This feature is locked until payment.');
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaid, isAdmin, activeTab]);

  // Anti-Debug: Triggers a breakpoint if console is open
  useEffect(() => {
    if (isPaid || isAdmin) return;
    const detector = setInterval(() => {
      const start = new Date();
      debugger; // This will pause the JS if DevTools is open
      const end = new Date();
      if (end - start > 100) {
        // DevTools likely open
        console.clear();
        console.log("%cSECURITY ALERT: Unauthorized access to source detected.", "color: red; font-size: 20px; font-weight: bold;");
      }
    }, 1000);
    return () => clearInterval(detector);
  }, [isPaid, isAdmin]);

  const handleChange = (field, value) => setData(prev => ({ ...prev, [field]: value }));
  const handleListUpdate = (key, idx, field, value) => {
    const list = [...data[key]];
    list[idx][field] = value;
    setData(prev => ({ ...prev, [key]: list }));
  };
  const addListItem = (key, item) => setData(prev => ({ ...prev, [key]: [...prev[key], item] }));
  const removeListItem = (key, idx) => setData(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));

  const [showStyle, setShowStyle] = useState(false);

  return (
    <div className="flex flex-col h-dvh overflow-hidden w-full bg-bg">
      <header className="header glass px-4">
        <div className="container flex justify-between items-center w-full !p-0">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.9 }}
              className="btn btn-ghost !p-2"
              onClick={onBack}
            >
              <ChevronLeft size={20} />
            </motion.button>
            <div className="flex flex-col">
              <h2 className="font-bold text-sm md:text-base leading-tight truncate max-w-[120px] md:max-w-none">
                {type?.title || 'Editor'}
              </h2>
              <span className="text-[10px] text-text-muted">
                {isSaving ? 'Saving...' : `Saved at ${lastSaved}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1 bg-black/10 p-1 rounded-xl mr-2">
              {['professional', 'executive', 'simple'].map(t => (
                <button
                  key={t}
                  onClick={() => setAiTone(t)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${aiTone === t ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowStyle(!showStyle)}
              className={`btn btn-ghost !p-2 ${showStyle ? 'text-primary' : ''}`}
            >
              <Heart size={20} className={showStyle ? 'fill-current' : ''} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary !py-2 !px-4 md:!px-6 shadow-lg"
              onClick={onDownload}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              <span className="hidden md:inline">Download PDF</span>
              <span className="md:hidden">Export</span>
            </motion.button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showStyle && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card-bg border-b border-card-border overflow-hidden"
          >
            <div className="container py-4 flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase text-text-muted">Accent Color</label>
                <input
                  type="color"
                  value={data.accentColor || '#6366f1'}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-lg overflow-hidden"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase text-text-muted">Text Color</label>
                <input
                  type="color"
                  value={data.textColor || '#111827'}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-lg overflow-hidden"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase text-text-muted">Template</label>
                <div className="flex bg-black/10 p-1 rounded-xl">
                  {['classic', 'modern', 'minimal'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTemplate(t)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${template === t ? 'bg-white text-black shadow-sm' : 'text-text-muted hover:text-white'}`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  handleChange('accentColor', '#6366f1');
                  handleChange('textColor', '#111827');
                }}
                className="text-[10px] font-bold text-primary hover:text-secondary uppercase underline ml-auto"
              >
                Reset Colors
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex border-b border-card-border bg-card-bg/50 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-text-muted'}`}
        >
          1. Edit Content
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-text-muted'}`}
        >
          2. Live Preview
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Side */}
        <div className={`flex-1 overflow-y-auto w-full lg:w-1/2 ${(activeTab === 'preview' && window.innerWidth < 1024) ? 'hidden' : 'block'}`}>
          <div className="container py-8 md:py-12 max-w-4xl">
            {type?.id === 'cv' ? (
              <CVEditor data={data || {}} onChange={handleChange} onListUpdate={handleListUpdate} onAddList={addListItem} onRemoveList={removeListItem} aiTone={aiTone} onAiUse={() => setShowAiNotice(true)} />
            ) : type?.id === 'tenancy' || type?.id === 'shop_tenancy' ? (
              <TenancyEditor data={data || {}} onChange={handleChange} />
            ) : type?.id === 'invoice' ? (
              <InvoiceEditor data={data || {}} onChange={handleChange} onListUpdate={handleListUpdate} onAddList={addListItem} onRemoveList={removeListItem} />
            ) : type?.id === 'leave_permission' ? (
              <LeaveEditor data={data || {}} onChange={handleChange} aiTone={aiTone} onAiUse={() => setShowAiNotice(true)} />
            ) : type?.id === 'employment_contract' ? (
              <ContractEditor data={data || {}} onChange={handleChange} />
            ) : type?.id === 'recommendation' ? (
              <RecommendationEditor data={data || {}} onChange={handleChange} aiTone={aiTone} onAiUse={() => setShowAiNotice(true)} />
            ) : type?.id === 'letter' ? (
              <LetterEditor data={data || {}} onChange={handleChange} aiTone={aiTone} onAiUse={() => setShowAiNotice(true)} />
            ) : type?.id === 'job_offer' ? (
              <JobOfferEditor data={data || {}} onChange={handleChange} aiTone={aiTone} onAiUse={() => setShowAiNotice(true)} />
            ) : type?.id === 'qr_code' ? (
              <QRCodeEditor data={data || {}} onChange={handleChange} />
            ) : type?.id === 'rent_receipt' ? (
              <RentReceiptEditor data={data || {}} onChange={handleChange} />
            ) : (
              <GenericEditor data={data || {}} onChange={handleChange} />
            )}
          </div>
        </div>

        <AnimatePresence>
          {showAiNotice && (
            <motion.div
              initial={{ y: -100, opacity: 0, x: '-50%' }}
              animate={{ y: 0, opacity: 1, x: '-50%' }}
              exit={{ y: -100, opacity: 0, x: '-50%' }}
              className="fixed top-24 left-1/2 z-[100] bg-white/10 backdrop-blur-2xl text-white px-5 py-3 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center gap-3 border border-white/20 w-[92%] max-w-sm cursor-pointer hover:bg-white/20 transition-colors"
              onClick={() => setShowAiNotice(false)}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles size={16} className="text-white animate-pulse" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-[11px] leading-tight uppercase tracking-wider text-white">AI Suggestion Added</p>
                <p className="text-[10px] opacity-70 truncate font-medium">Please cross-check bracketed [placeholders].</p>
              </div>
              <X size={14} className="opacity-40" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Side (Desktop & Mobile Preview Tab) */}
        <div className={`flex-1 bg-black/5 overflow-y-auto lg:border-l lg:border-card-border ${(activeTab === 'edit' && window.innerWidth < 1024) ? 'hidden' : 'block'}`}>
          <div className="py-8 md:py-12 flex flex-col items-center">
            <div className="mb-8 flex flex-col items-center gap-4 w-full px-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Live Document Preview</h3>
              {(type.id === 'cv' || type.id === 'tenancy' || type.id === 'shop_tenancy' || type.id === 'letter') && (
                <div className="flex gap-2 bg-black/10 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${template === t.id ? 'bg-white text-black shadow-md' : 'text-text-muted hover:text-white'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="preview-pane w-full max-w-[1000px] overflow-x-hidden" style={{ '--doc-scale': docScale }}>
              <div className={`document-page shadow-2xl ${(!isPaid && !isAdmin) ? 'document-protected' : ''}`}>
                <div className={(!isPaid && !isAdmin) ? 'content-blur' : ''}>
                  <PreviewContent id={type?.id} data={data || {}} template={template} isPaid={isPaid} isAdmin={isAdmin} />
                </div>
              </div>
            </div>

            <div className="mt-8 text-text-muted text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
              <Shield size={12} /> Encrypted & Secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EditorSection = ({ icon: Icon, title, children, id }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    whileInView={{ y: 0, opacity: 1 }}
    viewport={{ once: true }}
    className="card !p-6 md:!p-10 border-l-4 border-l-primary mb-8"
    id={id}
  >
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h3>
        <div className="h-1 w-12 bg-primary/20 rounded-full mt-1"></div>
      </div>
    </div>
    <div className="space-y-6">{children}</div>
  </motion.div>
);

function QRCodeEditor({ data, onChange }) {
  if (!data) return null;
  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={Hash} title="1. QR Content" id="qr-content">
        <Input label="QR Label / Title" value={data.label} onChange={v => onChange('label', v)} />
        <TextArea label="Content (URL, Phone, or Text)" value={data.content} onChange={v => onChange('content', v)} />
      </EditorSection>
      <EditorSection icon={Sparkles} title="2. Design Tips" id="qr-tips">
        <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-sm text-text-muted leading-relaxed">
            Your QR code will update in real-time. You can use it for:
            <br /><br />
            • <strong>URLs:</strong> https://mysite.com
            <br />• <strong>Phone:</strong> tel:+123456789
            <br />• <strong>Plain Text:</strong> Any message you want
          </p>
        </div>
      </EditorSection>
    </div>
  );
}

function LetterEditor({ data, onChange, aiTone, onAiUse }) {
  if (!data) return null;
  const [aiLoading, setAiLoading] = React.useState({});

  const handleAiSuggestion = async (field, prompt, systemPrompt) => {
    setAiLoading(prev => ({ ...prev, [field]: true }));
    try {
      const result = await generateCVContent(prompt, systemPrompt);
      onChange(field, result);
      if (onAiUse) onAiUse();
    } catch (err) { console.error(err); alert("Failed to generate AI content."); }
    finally { setAiLoading(prev => ({ ...prev, [field]: false })); }
  };

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={User} title="1. Your Details (Sender)" id="sender">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Your Full Name" value={data.senderName} onChange={v => onChange('senderName', v)} />
          <Input label="Your Phone" value={data.senderPhone} onChange={v => onChange('senderPhone', v)} />
          <Input label="Your Email" value={data.senderEmail} onChange={v => onChange('senderEmail', v)} />
          <Input label="Date" value={data.date} onChange={v => onChange('date', v)} />
          <div className="md:col-span-2">
            <Input label="Your Address" value={data.senderAddress} onChange={v => onChange('senderAddress', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={Briefcase} title="2. Recipient Details" id="recipient">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Recipient Name" value={data.recipient} onChange={v => onChange('recipient', v)} />
          <Input label="Job Title / Department" value={data.recipientTitle} onChange={v => onChange('recipientTitle', v)} />
          <Input label="Company Name" value={data.company} onChange={v => onChange('company', v)} />
          <div className="md:col-span-2">
            <Input label="Company Address" value={data.companyAddress} onChange={v => onChange('companyAddress', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={Sparkles} title="3. Letter Content" id="content">
        <Input label="Subject Line (Optional)" value={data.subject} onChange={v => onChange('subject', v)} />
        <TextArea
          label="Letter Body"
          value={data.body}
          onChange={v => onChange('body', v)}
          onAiClick={() => handleAiSuggestion(
            'body',
            `Write or refine a cover letter body. Context: Sender ${data.senderName} applying to ${data.company || '[Company Name]'} for the role of ${data.recipientTitle || '[Job Title]'}. Tone: ${aiTone}. Current text: ${data.body}`,
            `You are an expert career coach and professional writer. Improve the provided cover letter text. Use a ${aiTone} tone. Use the specific company (${data.company}) and job title (${data.recipientTitle}) provided to make it highly personalized. If any details are unknown, use placeholders like [Industry]. Output the text directly.`
          )}
          isAiLoading={aiLoading['body']}
        />
      </EditorSection>
    </div>
  );
}

function CVEditor({ data, onChange, onListUpdate, onAddList, onRemoveList, aiTone, onAiUse }) {
  if (!data) return <div className="p-12 text-center text-text-muted">No editor data available.</div>;
  const [aiLoading, setAiLoading] = React.useState({});

  const handleAiSuggestion = async (field, prompt, systemPrompt) => {
    setAiLoading(prev => ({ ...prev, [field]: true }));
    try {
      const result = await generateCVContent(prompt, systemPrompt);
      onChange(field, result);
      if (onAiUse) onAiUse();
    } catch (err) {
      console.error(err);
      alert("Failed to generate AI content. Please check your connection or console for details.");
    } finally {
      setAiLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleListAiSuggestion = async (key, idx, field, prompt, systemPrompt) => {
    const loadingKey = `${key}-${idx}-${field}`;
    setAiLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const result = await generateCVContent(prompt, systemPrompt);
      onListUpdate(key, idx, field, result);
      if (onAiUse) onAiUse();
    } catch (err) {
      console.error(err);
      alert("Failed to generate AI content. Please check your connection or console for details.");
    } finally {
      setAiLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert("Image too large (max 2MB)");
      const reader = new FileReader();
      reader.onloadend = () => onChange('photo', reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={User} title="1. Personal Information" id="personal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="label">Profile Photo (Optional)</label>
            <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-dashed border-card-border">
              <div className="w-24 h-24 rounded-full bg-card-bg border border-card-border overflow-hidden flex items-center justify-center">
                {data.photo ? <img src={data.photo} className="w-full h-full object-cover" style={{ transform: `scale(${data.photoZoom || 1})`, objectPosition: `${data.photoX || 50}% ${data.photoY || 50}%` }} /> : <Camera size={32} className="text-text-muted" />}
              </div>
              <div className="flex flex-col gap-4 flex-1">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="photo-upload" />
                <div className="flex gap-2">
                  <label htmlFor="photo-upload" className="btn btn-primary !py-2 !px-4 text-xs cursor-pointer"><ImageIcon size={14} /> {data.photo ? 'Change Photo' : 'Upload Photo'}</label>
                  {data.photo && <button onClick={() => onChange('photo', null)} className="btn btn-ghost !py-2 !px-4 text-xs select-none"><Trash2 size={14} /> Remove</button>}
                </div>

                {data.photo && (
                  <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-card-border">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-text-muted">Zoom</label><span className="text-[10px] text-primary">{Math.round((data.photoZoom || 1) * 100)}%</span></div>
                      <input type="range" min="1" max="3" step="0.1" value={data.photoZoom || 1} onChange={e => onChange('photoZoom', parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-card-bg rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-text-muted">Horizontal Position</label><span className="text-[10px] text-primary">{data.photoX || 50}%</span></div>
                      <input type="range" min="0" max="100" step="1" value={data.photoX || 50} onChange={e => onChange('photoX', parseInt(e.target.value))} className="w-full accent-primary h-1 bg-card-bg rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-text-muted">Vertical Position</label><span className="text-[10px] text-primary">{data.photoY || 50}%</span></div>
                      <input type="range" min="0" max="100" step="1" value={data.photoY || 50} onChange={e => onChange('photoY', parseInt(e.target.value))} className="w-full accent-primary h-1 bg-card-bg rounded-lg appearance-none cursor-pointer" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Input label="Full Name" value={data.fullName} onChange={v => onChange('fullName', v)} />
          <Input label="Residential Address" value={data.address} onChange={v => onChange('address', v)} />
          <Input label="Phone Number" value={data.phone} onChange={v => onChange('phone', v)} />
          <Input label="Email Address" value={data.email} onChange={v => onChange('email', v)} />
          <Input label="Date of Birth & Gender" value={data.dobGender} onChange={v => onChange('dobGender', v)} />
          <Input label="Nationality" value={data.nationality} onChange={v => onChange('nationality', v)} />
        </div>
      </EditorSection>

      <EditorSection icon={FileText} title="2. Professional Summary" id="summary">
        <TextArea
          label="About Me"
          value={data.summary}
          onChange={v => onChange('summary', v)}
          onAiClick={() => handleAiSuggestion(
            'summary',
            `Write a high-impact professional CV summary for ${data.fullName || 'a professional'}. Current/Target Role: ${data.experience?.[0]?.title || '[Job Title]'}. Field: ${data.experience?.[0]?.company || '[Industry]'}. Tone: ${aiTone}.`,
            "You are a master CV writer. Create a powerful 3-4 sentence professional summary. Use the provided Job Title and Company context to make it specific. Use [Placeholders] for missing years of experience."
          )}
          isAiLoading={aiLoading['summary']}
        />
      </EditorSection>

      <EditorSection icon={Briefcase} title="3. Work Experience" id="experience">
        <Reorder.Group axis="y" values={data.experience || []} onReorder={v => onChange('experience', v)} className="space-y-4">
          {data.experience?.map((exp, i) => (
            <Reorder.Item key={exp.id || i} value={exp} className="flex flex-col gap-4 p-6 bg-white/5 rounded-2xl border border-card-border relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-text-muted cursor-grab active:cursor-grabbing" />
                  <span className="text-[10px] font-bold text-text-muted uppercase">Experience {i + 1}</span>
                </div>
                <button onClick={() => i >= 0 && onRemoveList('experience', i)} className="text-text-muted hover:text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Job Title" value={exp.title} onChange={v => onListUpdate('experience', i, 'title', v)} />
                <Input label="Dates" value={exp.dates} onChange={v => onListUpdate('experience', i, 'dates', v)} />
              </div>
              <Input label="Company Name" value={exp.company} onChange={v => onListUpdate('experience', i, 'company', v)} />
              <TextArea
                label="Key Responsibilities"
                value={exp.tasks}
                onChange={v => onListUpdate('experience', i, 'tasks', v)}
                onAiClick={() => handleListAiSuggestion(
                  'experience', i, 'tasks',
                  `Generate 4-5 impact-driven professional bullet points for the role of '${exp.title}' at '${exp.company}'. Focus on responsibilities, duties and achievements. Tone: ${aiTone}.`,
                  "You are an expert resume writer. Do not use quotation marks."
                )}
                isAiLoading={aiLoading[`experience-${i}-tasks`]}
              />
              <Input label="Key Achievement" value={exp.achievement} onChange={v => onListUpdate('experience', i, 'achievement', v)} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
        <button onClick={() => onAddList('experience', { id: Date.now(), title: '', company: '', dates: '', tasks: '', achievement: '' })} className="btn btn-ghost w-full border-dashed"><Plus size={18} /> Add Experience</button>
      </EditorSection>

      <EditorSection icon={BookOpen} title="4. Education & Training" id="education">
        {data.education?.map((edu, i) => (
          <div key={i} className="space-y-4 p-6 bg-white/5 rounded-2xl border border-card-border relative">
            <button onClick={() => onRemoveList('education', i)} className="absolute top-4 right-4 text-text-muted hover:text-red-400"><Trash2 size={16} /></button>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Degree / Course" value={edu.degree} onChange={v => onListUpdate('education', i, 'degree', v)} />
              <Input label="Dates" value={edu.dates} onChange={v => onListUpdate('education', i, 'dates', v)} />
            </div>
            <Input label="School / Institution" value={edu.school} onChange={v => onListUpdate('education', i, 'school', v)} />
          </div>
        ))}
        <button onClick={() => onAddList('education', { degree: '', school: '', dates: '' })} className="btn btn-ghost w-full border-dashed"><Plus size={18} /> Add Education</button>
      </EditorSection>

      <EditorSection icon={Award} title="5. Leadership & Volunteering" id="leadership">
        {data.leadership?.map((item, i) => (
          <div key={i} className="space-y-4 p-6 bg-white/5 rounded-2xl border border-card-border relative">
            <button onClick={() => onRemoveList('leadership', i)} className="absolute top-4 right-4 text-text-muted hover:text-red-400"><Trash2 size={16} /></button>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Role" value={item.role} onChange={v => onListUpdate('leadership', i, 'role', v)} />
              <Input label="Organization" value={item.org} onChange={v => onListUpdate('leadership', i, 'org', v)} />
            </div>
            <Input label="Achievement" value={item.achievement} onChange={v => onListUpdate('leadership', i, 'achievement', v)} />
          </div>
        ))}
        <button onClick={() => onAddList('leadership', { role: '', org: '', achievement: '' })} className="btn btn-ghost w-full border-dashed"><Plus size={18} /> Add Leadership Role</button>
      </EditorSection>

      <EditorSection icon={CheckSquare} title="6. Skills" id="skills">
        <TextArea
          label="Technical Skills"
          value={data.techSkills}
          onChange={v => onChange('techSkills', v)}
          onAiClick={() => handleAiSuggestion(
            'techSkills',
            `List essential technical skills for a ${data.experience?.[0]?.title || 'professional'}. Format as a comma separated list of the top 10 most relevant skills.`,
            "You are a professional CV skills consultant. Do not use quotation marks."
          )}
          isAiLoading={aiLoading['techSkills']}
        />
        <TextArea
          label="Soft Skills"
          value={data.softSkills}
          onChange={v => onChange('softSkills', v)}
          onAiClick={() => handleAiSuggestion(
            'softSkills',
            `List essential soft skills for a ${data.experience?.[0]?.title || 'professional'}. Format as a comma separated list of the top 8 most relevant soft skills.`,
            "You are a professional CV skills consultant. Do not use quotation marks."
          )}
          isAiLoading={aiLoading['softSkills']}
        />
      </EditorSection>

      <EditorSection icon={Languages} title="7. Languages" id="languages">
        <TextArea label="Languages (e.g. English - Native, French - Intermediate)" value={data.languages} onChange={v => onChange('languages', v)} />
      </EditorSection>

      <EditorSection icon={Heart} title="8. Other Information" id="other">
        <TextArea label="Interests & Hobbies (Comma or newline separated)" value={data.hobbies} onChange={v => onChange('hobbies', v)} />
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-primary" />
            <span className="font-bold text-sm uppercase">Professional References</span>
          </div>
          {data.references?.map?.((ref, i) => (
            <div key={ref.id || i} className="p-4 bg-white/5 rounded-xl border border-card-border relative group">
              <button onClick={() => onRemoveList('references', i)} className="absolute top-2 right-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Reference Name" value={ref.name} onChange={v => onListUpdate('references', i, 'name', v)} />
                <Input label="Reference Phone" value={ref.phone} onChange={v => onListUpdate('references', i, 'phone', v)} />
                <div className="md:col-span-2">
                  <Input label="Working At (Company/Organization)" value={ref.org} onChange={v => onListUpdate('references', i, 'org', v)} />
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => onAddList('references', { id: Date.now(), name: '', org: '', phone: '' })} className="btn btn-ghost w-full border-dashed"><Plus size={16} /> Add Reference</button>
        </div>
      </EditorSection>
    </div>
  );
}

function TenancyEditor({ data, onChange }) {
  if (!data) return <div className="p-12 text-center text-text-muted">No editor data available.</div>;

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={HomeIcon} title="1. Property & Agreement Details" id="property">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Agreement Date" value={data.agreementDate} onChange={v => onChange('agreementDate', v)} />
          <Input label="Property Address" value={data.propertyAddress} onChange={v => onChange('propertyAddress', v)} />
          <div className="md:col-span-2">
            <TextArea label="Property Description (e.g., 2 Bedroom Flat)" value={data.propertyDescription} onChange={v => onChange('propertyDescription', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={User} title="2. Landlord Information" id="landlord">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Landlord Full Name" value={data.landlordName} onChange={v => onChange('landlordName', v)} />
          <Input label="Phone Number" value={data.landlordPhone} onChange={v => onChange('landlordPhone', v)} />
          <div className="md:col-span-2">
            <Input label="Residential Address" value={data.landlordAddress} onChange={v => onChange('landlordAddress', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={Users} title="3. Tenant Information" id="tenant">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Tenant Full Name" value={data.tenantName} onChange={v => onChange('tenantName', v)} />
          <Input label="Business Name (If applicable)" value={data.businessName} onChange={v => onChange('businessName', v)} />
          <Input label="Phone Number" value={data.tenantPhone} onChange={v => onChange('tenantPhone', v)} />
          <Input label="ID Type (e.g. Ghana Card)" value={data.tenantIdType} onChange={v => onChange('tenantIdType', v)} />
          <Input label="ID Number" value={data.tenantIdNumber} onChange={v => onChange('tenantIdNumber', v)} />
        </div>
      </EditorSection>

      <EditorSection icon={CreditCard} title="4. Rent & Duration" id="rent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Duration (e.g. 1 Year)" value={data.termDuration} onChange={v => onChange('termDuration', v)} />
          <Input label="Rent Amount (GHS)" value={data.rentAmount} onChange={v => onChange('rentAmount', v)} />
          <Input label="Start Date" value={data.startDate} onChange={v => onChange('startDate', v)} />
          <Input label="End Date" value={data.endDate} onChange={v => onChange('endDate', v)} />
          <Input label="Payment Frequency" value={data.paymentFrequency} onChange={v => onChange('paymentFrequency', v)} />
          <Input label="Advance Payment (GHS)" value={data.advancePayment} onChange={v => onChange('advancePayment', v)} />
          <Input label="Security Deposit (GHS)" value={data.securityDeposit} onChange={v => onChange('securityDeposit', v)} />
        </div>
      </EditorSection>

      <EditorSection icon={FileText} title="5. Terms & Conditions" id="terms">
        <TextArea label="Utilities Responsibility" value={data.utilities} onChange={v => onChange('utilities', v)} />
        <TextArea label="Other Terms" value={data.otherTerms} onChange={v => onChange('otherTerms', v)} />
      </EditorSection>

      <EditorSection icon={Check} title="6. Witnesses" id="witnesses">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-primary">Witness 1 (Landlord Side)</h4>
            <Input label="Name" value={data.witness1Name} onChange={v => onChange('witness1Name', v)} />
            <Input label="Phone" value={data.witness1Phone} onChange={v => onChange('witness1Phone', v)} />
            <Input label="Address" value={data.witness1Address} onChange={v => onChange('witness1Address', v)} />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-primary">Witness 2 (Tenant Side)</h4>
            <Input label="Name" value={data.witness2Name} onChange={v => onChange('witness2Name', v)} />
            <Input label="Phone" value={data.witness2Phone} onChange={v => onChange('witness2Phone', v)} />
            <Input label="Address" value={data.witness2Address} onChange={v => onChange('witness2Address', v)} />
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

function InvoiceEditor({ data, onChange, onListUpdate, onAddList, onRemoveList }) {
  if (!data) return null;

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={Hash} title="1. Invoice Details" id="invoice-details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Invoice Number" value={data.invoiceNumber} onChange={v => onChange('invoiceNumber', v)} />
          <Input label="Date" value={data.date} onChange={v => onChange('date', v)} />
        </div>
      </EditorSection>

      <EditorSection icon={Briefcase} title="2. Your Business Info" id="business-info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="label">Business Logo</label>
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-dashed border-card-border">
              <div className="w-16 h-16 rounded-xl bg-card-bg border border-card-border overflow-hidden flex items-center justify-center">
                {data.businessLogo ? <img src={data.businessLogo} className="w-full h-full object-contain" /> : <Camera size={24} className="text-text-muted" />}
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => onChange('businessLogo', reader.result);
                    reader.readAsDataURL(file);
                  }
                }} />
                <div className="flex gap-2">
                  <label htmlFor="logo-upload" className="btn btn-primary !py-1.5 !px-3 text-[10px] cursor-pointer">Upload Logo</label>
                  {data.businessLogo && <button onClick={() => onChange('businessLogo', null)} className="btn btn-ghost !py-1.5 !px-3 text-[10px]">Remove</button>}
                </div>
              </div>
            </div>
          </div>
          <Input label="Business Name" value={data.businessName} onChange={v => onChange('businessName', v)} />
          <Input label="Business TIN" value={data.businessTin} onChange={v => onChange('businessTin', v)} />
          <Input label="Phone" value={data.businessPhone} onChange={v => onChange('businessPhone', v)} />
          <Input label="Email" value={data.businessEmail} onChange={v => onChange('businessEmail', v)} />
          <div className="md:col-span-2">
            <Input label="Address" value={data.businessAddress} onChange={v => onChange('businessAddress', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={Sparkles} title="3. Watermark Settings" id="watermark">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-card-border">
            <div>
              <h4 className="font-bold text-sm">Document Watermark</h4>
              <p className="text-[10px] text-text-muted uppercase font-bold mt-1">Add a faded background identifier</p>
            </div>
            <button
              onClick={() => onChange('showWatermark', !data.showWatermark)}
              style={{
                width: '64px',
                height: '32px',
                backgroundColor: data.showWatermark ? 'var(--primary)' : '#334155',
                borderRadius: '32px',
                position: 'relative',
                border: '2px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: data.showWatermark ? '0 0 20px var(--primary-glow)' : 'none',
                display: 'block',
                flexShrink: 0
              }}
              aria-label="Toggle Watermark"
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: data.showWatermark ? '34px' : '2px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </button>
          </div>

          {data.showWatermark && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onChange('watermarkType', 'text')}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${data.watermarkType === 'text' ? 'border-primary bg-primary/5' : 'border-card-border bg-white/5'}`}
              >
                <div className="text-xs font-bold uppercase mb-1">Business Name</div>
                <div className="text-[10px] text-text-muted line-clamp-1">{data.businessName || 'Your Name'}</div>
              </button>
              <button
                onClick={() => onChange('watermarkType', 'logo')}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${data.watermarkType === 'logo' ? 'border-primary bg-primary/5' : 'border-card-border bg-white/5'}`}
                disabled={!data.businessLogo}
              >
                <div className="text-xs font-bold uppercase mb-1">Company Logo</div>
                <div className="text-[10px] text-text-muted">{data.businessLogo ? 'Ready' : 'Upload logo first'}</div>
              </button>
            </div>
          )}
        </div>
      </EditorSection>

      <EditorSection icon={User} title="3. Customer Info" id="customer-info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Customer Name" value={data.customerName} onChange={v => onChange('customerName', v)} />
          <Input label="Customer Phone" value={data.customerPhone} onChange={v => onChange('customerPhone', v)} />
          <div className="md:col-span-2">
            <Input label="Customer Address" value={data.customerAddress} onChange={v => onChange('customerAddress', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={ShoppingCart} title="4. Items & Pricing" id="items">
        <Reorder.Group axis="y" values={data.items || []} onReorder={v => onChange('items', v)} className="space-y-4">
          {data.items?.map((item, i) => (
            <Reorder.Item key={item.id || i} value={item} className="space-y-4 p-6 bg-white/5 rounded-2xl border border-card-border relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-text-muted cursor-grab active:cursor-grabbing" />
                  <span className="text-[10px] font-bold text-text-muted uppercase">Item {i + 1}</span>
                </div>
                <button onClick={() => i >= 0 && onRemoveList('items', i)} className="text-text-muted hover:text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Input label="Description" value={item.desc} onChange={v => onListUpdate('items', i, 'desc', v)} />
                </div>
                <div className="form-group">
                  <label className="label">Qty</label>
                  <div className="flex gap-2">
                    <select
                      className="input !w-auto !py-0 !px-2 text-xs"
                      style={{ color: 'var(--text)' }}
                      value={item.qty === 'N/A' ? 'N/A' : 'Val'}
                      onChange={(e) => onListUpdate('items', i, 'qty', e.target.value === 'N/A' ? 'N/A' : '')}
                    >
                      <option value="Val" style={{ color: '#000' }}>Value</option>
                      <option value="N/A" style={{ color: '#000' }}>N/A</option>
                    </select>
                    {item.qty !== 'N/A' && (
                      <input
                        className="input flex-1"
                        style={{ color: 'var(--text)' }}
                        type="text"
                        value={item.qty}
                        onChange={(e) => onListUpdate('items', i, 'qty', e.target.value)}
                        placeholder="1"
                      />
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Unit Price (GHS)</label>
                  <div className="flex gap-2">
                    <select
                      className="input !w-auto !py-0 !px-2 text-xs"
                      style={{ color: 'var(--text)' }}
                      value={item.price === 'N/A' ? 'N/A' : 'Val'}
                      onChange={(e) => onListUpdate('items', i, 'price', e.target.value === 'N/A' ? 'N/A' : '')}
                    >
                      <option value="Val" style={{ color: '#000' }}>Value</option>
                      <option value="N/A" style={{ color: '#000' }}>N/A</option>
                    </select>
                    {item.price !== 'N/A' && (
                      <input
                        className="input flex-1"
                        style={{ color: 'var(--text)' }}
                        type="text"
                        value={item.price}
                        onChange={(e) => onListUpdate('items', i, 'price', e.target.value)}
                        placeholder="0.00"
                      />
                    )}
                  </div>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
        <button onClick={() => onAddList('items', { id: Date.now(), desc: '', qty: '', price: '' })} className="btn btn-ghost w-full border-dashed"><Plus size={18} /> Add Item</button>
        <div className="pt-4 border-t border-card-border">
          <Input label="Tax Rate (%) e.g. 15 for VAT" value={data.taxRate} onChange={v => onChange('taxRate', parseFloat(v) || 0)} />
        </div>
      </EditorSection>

      <EditorSection icon={FileText} title="5. Notes" id="notes">
        <TextArea label="Additional Notes" value={data.notes} onChange={v => onChange('notes', v)} />
      </EditorSection>
    </div>
  );
}

function LeaveEditor({ data, onChange, aiTone, onAiUse }) {
  if (!data) return null;
  const [aiLoading, setAiLoading] = React.useState({});

  const handleAiSuggestion = async (field, prompt, systemPrompt) => {
    setAiLoading(prev => ({ ...prev, [field]: true }));
    try {
      const result = await generateCVContent(prompt, systemPrompt);
      onChange(field, result);
      if (onAiUse) onAiUse();
    } catch (err) {
      console.error(err);
      alert("Failed to generate AI content.");
    } finally {
      setAiLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={Briefcase} title="1. Company Information" id="company">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Company Name" value={data.companyName} onChange={v => onChange('companyName', v)} />
          <Input label="Company Phone" value={data.companyPhone} onChange={v => onChange('companyPhone', v)} />
          <div className="md:col-span-2">
            <Input label="Company Address" value={data.companyAddress} onChange={v => onChange('companyAddress', v)} />
          </div>
        </div>
      </EditorSection>

      <EditorSection icon={User} title="2. Employee Information" id="employee">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Full Name" value={data.employeeName} onChange={v => onChange('employeeName', v)} />
          <Input label="Employee ID" value={data.employeeId} onChange={v => onChange('employeeId', v)} />
          <Input label="Department" value={data.department} onChange={v => onChange('department', v)} />
          <Input label="Job Position" value={data.position} onChange={v => onChange('position', v)} />
        </div>
      </EditorSection>

      <EditorSection icon={Calendar} title="2. Absence Details" id="absence">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Start Date" value={data.startDate} onChange={v => onChange('startDate', v)} />
          <Input label="End Date" value={data.endDate} onChange={v => onChange('endDate', v)} />
          <Input label="Total Days" value={data.totalDays} onChange={v => onChange('totalDays', v)} />
          <Input label="Emergency Contact No." value={data.contactWhileAbsent} onChange={v => onChange('contactWhileAbsent', v)} />
        </div>
        <TextArea
          label="Reason for Absence"
          value={data.reason}
          onChange={v => onChange('reason', v)}
          onAiClick={() => handleAiSuggestion(
            'reason',
            `Rewrite this reason for leave professionally: "${data.reason}". Context: Employee ${data.employeeName} working as ${data.position} in ${data.department} department. Tone: Professional/Formal.`,
            "You are a professional administrative assistant. Output the text directly. If details are missing, use [Placeholders]."
          )}
          isAiLoading={aiLoading['reason']}
        />
      </EditorSection>

      <EditorSection icon={Check} title="3. Approval" id="approval">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Manager Name" value={data.managerName} onChange={v => onChange('managerName', v)} />
          <Input label="Request Date" value={data.requestDate} onChange={v => onChange('requestDate', v)} />
        </div>
      </EditorSection>
    </div>
  );
}

function ContractEditor({ data, onChange }) {
  if (!data) return null;
  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={Briefcase} title="1. Employer Details" id="employer">
        <Input label="Employer/Company Name" value={data.employerName} onChange={v => onChange('employerName', v)} />
        <TextArea label="Company Address" value={data.employerAddress} onChange={v => onChange('employerAddress', v)} />
      </EditorSection>

      <EditorSection icon={User} title="2. Employee Details" id="employee">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Full Name" value={data.employeeName} onChange={v => onChange('employeeName', v)} />
          <Input label="Job Title" value={data.jobTitle} onChange={v => onChange('jobTitle', v)} />
          <Input label="ID Type (e.g. Ghana Card)" value={data.employeeIdType} onChange={v => onChange('employeeIdType', v)} />
          <Input label="ID Number" value={data.employeeIdNumber} onChange={v => onChange('employeeIdNumber', v)} />
        </div>
        <TextArea label="Residential Address" value={data.employeeAddress} onChange={v => onChange('employeeAddress', v)} />
      </EditorSection>

      <EditorSection icon={Clock} title="3. Terms of Employment" id="terms">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Commencement Date" value={data.commencementDate} onChange={v => onChange('commencementDate', v)} />
          <Input label="Probation Period" value={data.probationPeriod} onChange={v => onChange('probationPeriod', v)} />
          <Input label="Salary (GHS)" value={data.salaryAmount} onChange={v => onChange('salaryAmount', v)} />
          <Input label="Working Hours" value={data.workingHours} onChange={v => onChange('workingHours', v)} />
          <Input label="Annual Leave (Days)" value={data.annualLeave} onChange={v => onChange('annualLeave', v)} />
          <Input label="Notice Period" value={data.noticePeriod} onChange={v => onChange('noticePeriod', v)} />
        </div>
      </EditorSection>
    </div>
  );
}

function RecommendationEditor({ data, onChange, aiTone, onAiUse }) {
  if (!data) return null;
  const [aiLoading, setAiLoading] = React.useState({});
  const handleAiSuggestion = async (field, prompt, systemPrompt) => {
    setAiLoading(prev => ({ ...prev, [field]: true }));
    try {
      const result = await generateCVContent(prompt, systemPrompt);
      onChange(field, result);
      if (onAiUse) onAiUse();
    } catch (err) { console.error(err); alert("Failed to generate AI content."); }
    finally { setAiLoading(prev => ({ ...prev, [field]: false })); }
  };

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={User} title="1. Recommender Info" id="recommender">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Your Full Name" value={data.recommenderName} onChange={v => onChange('recommenderName', v)} />
          <Input label="Your Job Title" value={data.recommenderTitle} onChange={v => onChange('recommenderTitle', v)} />
          <div className="md:col-span-2">
            <Input label="Organization" value={data.recommenderOrg} onChange={v => onChange('recommenderOrg', v)} />
          </div>
        </div>
      </EditorSection>
      <EditorSection icon={Users} title="2. Recipient Info" id="recipient">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Candidate Full Name" value={data.candidateName} onChange={v => onChange('candidateName', v)} />
          <Input label="Candidate Job Title" value={data.candidateTitle} onChange={v => onChange('candidateTitle', v)} />
        </div>
      </EditorSection>
      <EditorSection icon={FileText} title="3. Recommendation Letter" id="letter">
        <TextArea
          label="Letter Body"
          value={data.body}
          onChange={v => onChange('body', v)}
          onAiClick={() => handleAiSuggestion(
            'body',
            `Write a ${aiTone} recommendation letter for ${data.candidateName} who worked as a ${data.candidateTitle}. Recommender: ${data.recommenderName}, ${data.recommenderTitle} at ${data.recommenderOrg}.`,
            `You are a professional recommender. Use a ${aiTone} tone. Do not use quotation marks.`
          )}
          isAiLoading={aiLoading['body']}
        />
      </EditorSection>
    </div>
  );
}

function JobOfferEditor({ data, onChange, aiTone, onAiUse }) {
  if (!data) return null;
  const [aiLoading, setAiLoading] = React.useState({});
  const handleAiSuggestion = async (field, prompt, systemPrompt) => {
    setAiLoading(prev => ({ ...prev, [field]: true }));
    try {
      const result = await generateCVContent(prompt, systemPrompt);
      onChange(field, result);
      if (onAiUse) onAiUse();
    } catch (err) { console.error(err); alert("Failed to generate AI content."); }
    finally { setAiLoading(prev => ({ ...prev, [field]: false })); }
  };

  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={Briefcase} title="1. Employer Details" id="employer">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Company Name" value={data.companyName} onChange={v => onChange('companyName', v)} />
          <Input label="Manager Name" value={data.managerName} onChange={v => onChange('managerName', v)} />
        </div>
      </EditorSection>
      <EditorSection icon={User} title="2. Candidate Details" id="candidate">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Full Name" value={data.candidateName} onChange={v => onChange('candidateName', v)} />
          <Input label="Proposed Job Title" value={data.jobTitle} onChange={v => onChange('jobTitle', v)} />
        </div>
      </EditorSection>
      <EditorSection icon={CreditCard} title="3. Offer Terms" id="terms">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Salary Amount" value={data.salary} onChange={v => onChange('salary', v)} />
          <Input label="Start Date" value={data.startDate} onChange={v => onChange('startDate', v)} />
        </div>
        <TextArea
          label="Custom Terms / Welcome Message"
          value={data.welcomeMessage}
          onChange={v => onChange('welcomeMessage', v)}
          onAiClick={() => handleAiSuggestion(
            'welcomeMessage',
            `Write a ${aiTone} welcome message for a job offer letter for ${data.candidateName} as a ${data.jobTitle} at ${data.companyName}.`,
            `You are an HR manager. Use a ${aiTone} tone. Do not use quotation marks.`
          )}
          isAiLoading={aiLoading['welcomeMessage']}
        />
      </EditorSection>
    </div>
  );
}

function RentReceiptEditor({ data, onChange }) {
  if (!data) return null;
  return (
    <div className="space-y-12 pb-20 px-safe">
      <EditorSection icon={Hash} title="1. Receipt Details" id="receipt">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Receipt Number" value={data.receiptNo} onChange={v => onChange('receiptNo', v)} />
          <Input label="Date of Payment" value={data.date} onChange={v => onChange('date', v)} />
        </div>
      </EditorSection>
      <EditorSection icon={User} title="2. Payer & Payee" id="payer">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Paid By (Tenant)" value={data.tenantName} onChange={v => onChange('tenantName', v)} />
          <Input label="Received By (Landlord)" value={data.landlordName} onChange={v => onChange('landlordName', v)} />
        </div>
      </EditorSection>
      <EditorSection icon={CreditCard} title="3. Payment Info" id="payment">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Amount Paid (GHS)" value={data.amount} onChange={v => onChange('amount', v)} />
          <Input label="For Month/Period" value={data.period} onChange={v => onChange('period', v)} />
          <Input label="Payment Method" value={data.method} onChange={v => onChange('method', v)} />
        </div>
      </EditorSection>
    </div>
  );
}

function GenericEditor({ data, onChange }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="form-group">
          <label className="label">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</label>
          {typeof value === 'string' && value.length > 50 ? <textarea className="input" rows={8} value={value} onChange={e => onChange(key, e.target.value)} /> : <input className="input" type="text" value={value} onChange={e => onChange(key, e.target.value)} />}
        </div>
      ))}
    </div>
  );
}

function Input({ label, value, onChange, onAiClick, isAiLoading }) {
  return (
    <div className="form-group w-full group">
      <div className="flex justify-between items-center mb-1.5">
        <label className="label !mb-0">{label}</label>
        {onAiClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAiClick}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-primary hover:text-secondary transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Suggest
          </motion.button>
        )}
      </div>
      <div className="relative">
        <input
          className="input transition-all duration-300 group-hover:border-primary/50"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-focus-within:w-full"></div>
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, onAiClick, isAiLoading }) {
  return (
    <div className="form-group w-full group">
      <div className="flex justify-between items-center mb-1.5">
        <label className="label !mb-0">{label}</label>
        {onAiClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAiClick}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-primary hover:text-secondary transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Rewrite
          </motion.button>
        )}
      </div>
      <div className="relative">
        <textarea
          className="input min-h-[120px] py-3 resize-y transition-all duration-300 group-hover:border-primary/50"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Write your ${label.toLowerCase()} here. Use the AI tool for professional phrasing.`}
        />
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-focus-within:w-full"></div>
      </div>
    </div>
  );
}

function GhanaWatermark() {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', opacity: 0.04, pointerEvents: 'none', zIndex: 0, textAlign: 'center', width: '100%' }}>
      <div style={{ fontSize: '10rem', lineHeight: 1, marginBottom: '2rem' }}>★</div>
      <div style={{ fontSize: '4rem', fontWeight: 900, whiteSpace: 'nowrap' }}>OFFICIAL TENANCY AGREEMENT</div>
      <div style={{ fontSize: '2rem', fontWeight: 700 }}>RENT CONTROL DEPARTMENT GHANA</div>
    </div>
  );
}

const QRSection = ({ data, label = "Scan to Verify" }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(data))}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
      <img src={qrUrl} alt="QR Verification" style={{ width: '60px', height: '60px' }} />
      <span style={{ fontSize: '8px', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8' }}>{label}</span>
    </div>
  );
};

function TenancyPreview({ data, template, isPaid, isAdmin }) {
  if (!data) return null;
  const isGhana = template === 'ghana';
  const isShop = !!data.businessName;
  const accentColor = isGhana ? (isShop ? '#d97706' : '#059669') : '#000';

  return (
    <div className="document-cv" style={{ fontFamily: isGhana ? 'Outfit, sans-serif' : 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {isGhana && <GhanaWatermark />}

      <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
        {isShop && isGhana && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '99px', color: '#d97706', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
            <CreditCard size={12} /> Commercial Business Space
          </div>
        )}
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: accentColor }}>
          <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{isShop ? 'Commercial Tenancy Agreement' : 'Tenancy Agreement'}</ProtectText>
        </h1>
        <div style={{ height: '2px', background: accentColor, width: '60px', margin: '0.5rem auto' }}></div>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Dated: {data.agreementDate}</p>
      </div>

      <div style={{ fontSize: '0.9rem', lineHeight: '1.6', position: 'relative', zIndex: 1 }}>
        <section style={{ marginBottom: '1.5rem' }}>
          <p>This agreement is made on <strong>{data.agreementDate}</strong> between:</p>
          <div style={{ margin: '1rem 0', paddingLeft: '1rem', borderLeft: `3px solid ${isGhana ? '#059669' : '#e2e8f0'}` }}>
            <p><strong>LANDLORD:</strong> <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.landlordName}</ProtectText></p>
            <p><strong>ADDRESS:</strong> <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.landlordAddress}</ProtectText></p>
            <p><strong>PHONE:</strong> {data.landlordPhone}</p>
          </div>
          <p>AND</p>
          <div style={{ margin: '1rem 0', paddingLeft: '1rem', borderLeft: `3px solid ${isGhana ? '#059669' : '#e2e8f0'}` }}>
            <p><strong>TENANT:</strong> {data.tenantName}</p>
            {data.businessName && <p><strong>BUSINESS:</strong> {data.businessName}</p>}
            <p><strong>ID:</strong> {data.tenantIdType} - {data.tenantIdNumber}</p>
            <p><strong>PHONE:</strong> {data.tenantPhone}</p>
          </div>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: isGhana ? '#059669' : '#000' }}>1. ARTICLE OF AGREEMENT</h2>
          <p>The Landlord agrees to let and the Tenant agrees to take the premises situated at <strong>{data.propertyAddress}</strong> ({data.propertyDescription}).</p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: isGhana ? '#059669' : '#000' }}>2. TERM & RENT</h2>
          <p>The tenancy shall be for a duration of <strong>{data.termDuration}</strong> commencing on <strong>{data.startDate}</strong> and ending on <strong>{data.endDate}</strong>.</p>
          <p>The rent is <strong>GHS {data.rentAmount}</strong> payable <strong>{data.paymentFrequency}</strong>.</p>
          <p>Advance Payment: <strong>GHS {data.advancePayment}</strong> | Security Deposit: <strong>GHS {data.securityDeposit}</strong>.</p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: isGhana ? '#059669' : '#000' }}>3. UTILITIES & SERVICES</h2>
          <p>{data.utilities}</p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: isGhana ? '#059669' : '#000' }}>4. SPECIAL CONDITIONS</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{data.otherTerms}</p>
        </section>

        <section style={{ marginTop: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
                <p><strong>Landlord Signature</strong></p>
                <p style={{ fontSize: '0.75rem' }}>{data.landlordName}</p>
              </div>
            </div>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
                <p><strong>Tenant Signature</strong></p>
                <p style={{ fontSize: '0.75rem' }}>{data.tenantName}</p>
                {isShop && (
                  <div style={{ marginTop: '1rem', width: '100px', height: '60px', border: '2px dashed #e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                    BUSINESS STAMP / SEAL HERE
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Witnesses:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem' }}><strong>Witness 1 (Landlord Side):</strong></p>
              <p style={{ fontSize: '0.8rem' }}>Name: {data.witness1Name}</p>
              <p style={{ fontSize: '0.8rem' }}>Phone: {data.witness1Phone}</p>
              <p style={{ fontSize: '0.8rem' }}>Address: {data.witness1Address}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem' }}><strong>Witness 2 (Tenant Side):</strong></p>
              <p style={{ fontSize: '0.8rem' }}>Name: {data.witness2Name}</p>
              <p style={{ fontSize: '0.8rem' }}>Phone: {data.witness2Phone}</p>
              <p style={{ fontSize: '0.8rem' }}>Address: {data.witness2Address}</p>
            </div>
          </div>
        </section>

        {isGhana && (
          <div style={{ marginTop: '2rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
            <p>This document is generated via Spark Docs and complies with the Rent Act of Ghana.</p>
            <p>Note: Agreements must be registered with the Rent Control Department within 14 days of signing.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LetterPreview({ data, template }) {
  if (!data) return null;
  if (template === 'modern') return <ModernLetter data={data} />;
  if (template === 'minimal') return <MinimalLetter data={data} />;
  return <ClassicLetter data={data} />;
}

function ClassicLetter({ data }) {
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{data.senderName}</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{data.senderAddress}</p>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{data.senderPhone} | {data.senderEmail}</p>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{data.date || new Date().toLocaleDateString('en-GB')}</p>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Recipient:</p>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{data.recipient}</h3>
        {data.recipientTitle && <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>{data.recipientTitle}</p>}
        <p style={{ fontSize: '0.85rem' }}>{data.company}</p>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{data.companyAddress}</p>
      </div>
      {data.subject && (
        <div style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1rem', fontWeight: 800 }}>RE: {data.subject.toUpperCase()}</p>
        </div>
      )}
      <div style={{ fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-line', color: '#334155' }}>
        {data.body}
      </div>
      <div style={{ marginTop: '3rem' }}>
        <p>Sincerely,</p>
        <div style={{ marginTop: '2rem', borderTop: '1px solid #000', width: '200px', paddingTop: '0.5rem' }}>
          <p style={{ fontWeight: 800 }}>{data.senderName}</p>
        </div>
      </div>
    </div>
  );
}

function ModernLetter({ data }) {
  return (
    <div className="document-cv" style={{ fontFamily: 'Outfit, sans-serif', padding: '0 !important', overflow: 'hidden' }}>
      <header style={{ background: '#f8fafc', padding: '2.5rem 2rem', borderBottom: '4px solid #ec4899', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>{data.senderName}</h1>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
          <span>{data.senderEmail}</span><span>•</span><span>{data.senderPhone}</span><span>•</span><span>{data.senderAddress}</span>
        </div>
      </header>
      <div style={{ padding: '0 2rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Applying To:</p>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data.recipient}</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{data.company}</p>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{data.companyAddress}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{data.date || new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>
        {data.subject && (
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', borderLeft: '4px solid #ec4899', paddingLeft: '1rem' }}>{data.subject}</h2>
        )}
        <div style={{ fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-line', color: '#334155' }}>
          {data.body}
        </div>
        <div style={{ marginTop: '4rem' }}>
          <p style={{ fontWeight: 600, color: '#ec4899' }}>Best Regards,</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '0.5rem' }}>{data.senderName}</p>
        </div>
      </div>
    </div>
  );
}

// DOM Poisoning & Placeholder Highlighting Utility
const ProtectText = ({ children, isPaid, isAdmin }) => {
  if (typeof children !== 'string') return <>{children}</>;

  // Function to wrap [placeholders] in pulsing spans
  const highlightPlaceholders = (text) => {
    if (!text) return text;
    const parts = text.split(/(\[.*?\])/g);
    return parts.map((part, i) => {
      if (typeof part === 'string' && part.startsWith('[') && part.endsWith(']')) {
        return <span key={i} className="placeholder-beep">{part}</span>;
      }
      return part;
    });
  };

  // If paid/admin, just show highlighted text
  if (isPaid || isAdmin) {
    return <>{highlightPlaceholders(children)}</>;
  }

  // Unpaid: Poison text AND highlight placeholders (even if blurred, it helps scrapers fail)
  const poisoned = children.split('').map((char, i) => (
    <React.Fragment key={i}>
      {char}
      <span style={{ fontSize: 0, opacity: 0, position: 'absolute', pointerEvents: 'none' }}>
        {['#', '$', '8', 'x', '!', '?', '@', ' '][Math.floor(Math.random() * 8)]}
      </span>
    </React.Fragment>
  ));

  return <>{poisoned}</>;
};

function MinimalLetter({ data, isPaid, isAdmin }) {
  const accentColor = data.accentColor || '#6366f1';
  const textColor = data.textColor || '#111827';
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '2rem', color: textColor }}>
      <div style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 300, marginBottom: '0.5rem', color: accentColor }}>
          <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.senderName}</ProtectText>
        </h1>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '1px' }}>
          <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.senderEmail}</ProtectText> • {data.senderPhone} • {data.senderAddress.toUpperCase()}
        </div>
      </div>
      <div style={{ gridTemplateColumns: '1fr 2fr', display: 'grid', gap: '4rem' }}>
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>Details</p>
            <p style={{ fontSize: '0.85rem' }}><strong>Date:</strong> {data.date}</p>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>To</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{data.recipient}</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{data.company}</p>
          </div>
        </div>
        <div>
          {data.subject && <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2rem' }}>{data.subject}</h2>}
          <div style={{ fontSize: '0.95rem', lineHeight: '1.8', whiteSpace: 'pre-line', color: '#1e293b' }}>
            <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.body}</ProtectText>
          </div>
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sincerely,</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.5rem' }}>{data.senderName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ data, isPaid, isAdmin }) {
  if (!data) return null;

  const getLineTotal = (qty, price) => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    const isQNumeric = !isNaN(q) && qty !== '' && qty !== null && qty !== 'N/A';
    const isPNumeric = !isNaN(p) && price !== '' && price !== null && price !== 'N/A';

    if (isQNumeric && isPNumeric) return q * p;
    if (isPNumeric) return p; // Assume qty 1 for total purposes if price is present
    return 0;
  };

  const formatValue = (val) => {
    if (val === 'N/A') return 'N/A';
    const v = parseFloat(val);
    if (isNaN(v) || val === '' || val === null) return 'N/A';
    return val;
  };

  const formatCurrency = (val) => {
    if (val === 'N/A') return 'N/A';
    const v = parseFloat(val);
    if (isNaN(v) || val === '' || val === null) return 'N/A';
    return `GH₵ ${v.toFixed(2)}`;
  };

  const subtotal = data.items?.reduce((sum, item) => sum + getLineTotal(item.qty, item.price), 0) || 0;
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      {data.showWatermark && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', opacity: 0.05, pointerEvents: 'none', zIndex: 0, textAlign: 'center', width: '100%' }}>
          {data.watermarkType === 'logo' && data.businessLogo ? (
            <img src={data.businessLogo} style={{ width: '300px', height: '300px', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: '5rem', fontWeight: 900, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{data.businessName || 'INVOICE'}</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {data.businessLogo && (
            <div style={{ width: '60px', height: '60px', flexShrink: 0 }}>
              <img src={data.businessLogo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#6366f1' }}>
              <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.businessName || 'Your Business'}</ProtectText>
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.businessAddress}</p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>TIN: {data.businessTin}</p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.businessPhone} | {data.businessEmail}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>INVOICE</h2>
            <p style={{ fontSize: '0.8rem' }}><strong># {data.invoiceNumber}</strong></p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Date: {data.date}</p>
          </div>
          <QRSection data={{ inv: data.invoiceNumber, total }} />
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>Bill To:</h3>
        <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{data.customerName}</p>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.customerAddress}</p>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.customerPhone}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ textAlign: 'left', padding: '12px', fontSize: '0.75rem', color: '#64748b' }}>DESCRIPTION</th>
            <th style={{ textAlign: 'center', padding: '12px', fontSize: '0.75rem', color: '#64748b', width: '60px' }}>QTY</th>
            <th style={{ textAlign: 'right', padding: '12px', fontSize: '0.75rem', color: '#64748b', width: '100px' }}>UNIT PRICE</th>
            <th style={{ textAlign: 'right', padding: '12px', fontSize: '0.75rem', color: '#64748b', width: '100px' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item, i) => {
            const lineAmt = getLineTotal(item.qty, item.price);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '0.85rem' }}>{item.desc}</td>
                <td style={{ textAlign: 'center', padding: '12px', fontSize: '0.85rem' }}>{formatValue(item.qty)}</td>
                <td style={{ textAlign: 'right', padding: '12px', fontSize: '0.85rem' }}>{formatCurrency(item.price)}</td>
                <td style={{ textAlign: 'right', padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>GH₵ {lineAmt.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span>GH₵ {subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Tax ({data.taxRate}%):</span>
            <span>GH₵ {tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, borderTop: '2px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', color: '#6366f1' }}>
            <span>Total:</span>
            <span>GH₵ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '4rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>Notes:</h4>
        <p style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-line' }}>{data.notes}</p>
      </div>
    </div>
  );
}

function LeavePreview({ data, isPaid, isAdmin }) {
  if (!data) return null;
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid #8b5cf6', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase' }}>{data.companyName || 'COMPANY NAME'}</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.companyAddress}</p>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.companyPhone}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: '#1e293b' }}>Leave Request</h1>
          <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Permission to be Absent</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Employee Details</h3>
          <p style={{ fontSize: '0.9rem' }}><strong>Name:</strong> {data.employeeName}</p>
          <p style={{ fontSize: '0.9rem' }}><strong>ID:</strong> {data.employeeId}</p>
          <p style={{ fontSize: '0.9rem' }}><strong>Dept:</strong> {data.department}</p>
          <p style={{ fontSize: '0.9rem' }}><strong>Pos:</strong> {data.position}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.8rem' }}><strong>Date of Request:</strong> {data.requestDate}</p>
          <div style={{ marginTop: '1rem', display: 'inline-block', padding: '4px 12px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>{data.status}</div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem' }}>Absence Particulars</h3>
        <p style={{ fontSize: '0.9rem' }}><strong>Period:</strong> {data.startDate} to {data.endDate} ({data.totalDays} Days)</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}><strong>Reason:</strong></p>
        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
          <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.reason}</ProtectText>
        </p>
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}><strong>Emergency Contact:</strong> {data.contactWhileAbsent}</p>
      </div>

      <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>Employee Signature</p>
          <p style={{ fontSize: '0.75rem', marginTop: '1rem' }}>Date: _______________</p>
        </div>
        <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>Manager Approval ({data.managerName})</p>
          <p style={{ fontSize: '0.75rem', marginTop: '1rem' }}>Date: _______________</p>
        </div>
      </div>
    </div>
  );
}

function ContractPreview({ data, isPaid, isAdmin }) {
  if (!data) return null;
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#0ea5e9' }}>Employment Contract</h1>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>SME / Startup Standard Agreement</p>
      </div>

      <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '2rem' }}>
        <ProtectText isPaid={isPaid} isAdmin={isAdmin}>
          {`This Employment Agreement is made on ${data.contractDate} between ${data.employerName} (Employer) and ${data.employeeName} (Employee).`}
        </ProtectText>
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>1. Appointment & Department</h2>
        <p style={{ fontSize: '0.85rem' }}>The Employee is appointed as <strong>{data.jobTitle}</strong> within the <strong>{data.department}</strong> department, starting on <strong>{data.commencementDate}</strong>.</p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>2. Probation & Termination</h2>
        <p style={{ fontSize: '0.85rem' }}>A probation period of <strong>{data.probationPeriod}</strong> applies. Termination by either party requires <strong>{data.noticePeriod}</strong> notice.</p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>3. Remuneration & Hours</h2>
        <p style={{ fontSize: '0.85rem' }}>Gross Salary: <strong>GHS {data.salaryAmount}</strong> per month. Working hours: <strong>{data.workingHours}</strong>. Annual Leave: <strong>{data.annualLeave}</strong>.</p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>4. Duties</h2>
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#64748b' }}>Full job description to be provided as an annex to this contract. The Employee agrees to perform all duties faithfully.</p>
      </section>

      <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
        <div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>For Employer</p>
            <p style={{ fontSize: '0.75rem' }}>{data.employerName}</p>
          </div>
        </div>
        <div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>The Employee</p>
            <p style={{ fontSize: '0.75rem' }}>{data.employeeName}</p>
            <p style={{ fontSize: '0.6rem', color: '#94a3b8' }}>ID: {data.employeeIdNumber} ({data.employeeIdType})</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationPreview({ data, isPaid, isAdmin }) {
  if (!data) return null;
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '2px solid #8b5cf6', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#1e293b' }}>Letter of Recommendation</h1>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.9rem' }}><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>To Whom It May Concern,</p>
      </div>
      <div style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-line' }}>
        <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.body}</ProtectText>
      </div>
      <div style={{ marginTop: '4rem' }}>
        <p style={{ fontSize: '0.95rem' }}>Sincerely,</p>
        <div style={{ marginTop: '2rem', borderTop: '1px solid #000', width: '200px', paddingTop: '0.5rem' }}>
          <p style={{ fontWeight: 800 }}>{data.recommenderName}</p>
          <p style={{ fontSize: '0.85rem' }}>{data.recommenderTitle}</p>
          <p style={{ fontSize: '0.85rem' }}>{data.recommenderOrg}</p>
        </div>
      </div>
    </div>
  );
}

function JobOfferPreview({ data, isPaid, isAdmin }) {
  if (!data) return null;
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>{data.companyName}</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.companyAddress}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#1e293b' }}>Job Offer</h1>
        </div>
      </header>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.9rem' }}>Dear <strong>{data.candidateName}</strong>,</p>
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>We are pleased to offer you the position of <strong>{data.jobTitle}</strong> at <strong>{data.companyName}</strong>.</p>
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.9rem' }}><strong>Start Date:</strong> {data.startDate}</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}><strong>Monthly Salary:</strong> GHS {data.salary}</p>
      </div>
      <div style={{ fontSize: '0.95rem', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{data.welcomeMessage}</div>
      <div style={{ marginTop: '4rem' }}>
        <p style={{ fontSize: '0.95rem' }}>Signed,</p>
        <p style={{ fontWeight: 800, marginTop: '2rem' }}>{data.managerName}</p>
        <p style={{ fontSize: '0.85rem' }}>Hiring Manager</p>
      </div>
    </div>
  );
}

function RentReceiptPreview({ data, isPaid, isAdmin }) {
  if (!data) return null;
  return (
    <div className="document-cv" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ border: '4px double #d946ef', padding: '2rem', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #d946ef', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d946ef' }}>RENT RECEIPT</h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Official Payment Proof</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.9rem' }}><strong>No:</strong> {data.receiptNo}</p>
            <p style={{ fontSize: '0.9rem' }}><strong>Date:</strong> {data.date}</p>
          </div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            Received from <strong><ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.tenantName}</ProtectText></strong> the sum of <strong>GHS {data.amount}</strong>.
          </p>
          <p style={{ fontSize: '1rem' }}>Being rent payment for the period: <strong><ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.period}</ProtectText></strong>.</p>
          <p style={{ fontSize: '1rem', marginTop: '1rem' }}>Payment Method: <strong>{data.method}</strong></p>
        </div>
        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '0.5rem' }}></div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800 }}>{data.landlordName}</p>
            <p style={{ fontSize: '0.75rem' }}>Landlord Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ id, data, template, isPaid, isAdmin }) {
  if (!data) return <div className="p-12 text-center text-text-muted">Generating preview...</div>;
  if (id === 'cv') {
    if (template === 'modern') return <ModernCV data={data} isPaid={isPaid} isAdmin={isAdmin} />;
    if (template === 'minimal') return <MinimalCV data={data} isPaid={isPaid} isAdmin={isAdmin} />;
    return <ClassicCV data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  }
  if (id === 'tenancy' || id === 'shop_tenancy') return <TenancyPreview data={data} template={template} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'invoice') return <InvoicePreview data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'letter') return <LetterPreview data={data} template={template} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'leave_permission') return <LeavePreview data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'employment_contract') return <ContractPreview data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'recommendation') return <RecommendationPreview data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'job_offer') return <JobOfferPreview data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'rent_receipt') return <RentReceiptPreview data={data} isPaid={isPaid} isAdmin={isAdmin} />;
  if (id === 'qr_code') return <QRCodePreview data={data} />;

  return <div className="p-12 text-center text-text-muted">Preview coming soon for {id}</div>;
}

function QRCodePreview({ data }) {
  if (!data) return null;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.content || 'SPARK DOCS')}`;
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '2rem' }}>{data.label || 'Your QR Code'}</h1>
      <div style={{ padding: '2rem', background: '#fff', borderRadius: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        <img src={qrUrl} alt="Generated QR" style={{ width: '200px', height: '200px', display: 'block' }} />
      </div>
      <p style={{ marginTop: '2rem', color: '#64748b', fontSize: '0.9rem', maxWidth: '300px', wordBreak: 'break-all' }}>{data.content}</p>
      <div style={{ marginTop: '3rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Generated via SPARK DOCS ★</div>
    </div>
  );
}

const BulletList = ({ text, style = {} }) => {
  if (!text) return null;
  // Split by comma, newline or existing bullet points
  const items = text.split(/[,\n•*]/).map(t => t.trim()).filter(Boolean);
  return (
    <ul style={{ listStyleType: 'disc', paddingLeft: '1.2rem', margin: 0, ...style }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: '0.25rem' }}>{item}</li>
      ))}
    </ul>
  );
};

const ProficiencyInfographic = ({ level, color = '#6366f1' }) => {
  const getProficiency = (text) => {
    if (typeof text === 'number') return Math.min(5, Math.max(1, text));
    const t = String(text || '').toLowerCase();
    if (t.includes('native') || t.includes('fluent') || t.includes('expert')) return 5;
    if (t.includes('advanced') || t.includes('professional')) return 4;
    if (t.includes('intermediate')) return 3;
    if (t.includes('basic') || t.includes('beginner') || t.includes('elementary')) return 2;
    return 3;
  };

  const score = getProficiency(level);
  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i <= score ? color : '#e2e8f0' }} />
      ))}
    </div>
  );
};

function ClassicCV({ data, isPaid, isAdmin }) {
  const accentColor = data.accentColor || '#6366f1';
  const textColor = data.textColor || '#111827';
  if (!data) return null;
  return (
    <div className="document-cv" style={{ fontFamily: 'Inter, sans-serif', color: textColor }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: `2px solid ${accentColor}`, paddingBottom: '1.5rem', marginBottom: '1.5rem', gap: '1.5rem' }}>
        {data.photo && (
          <div style={{ width: '100px', height: '100px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img src={data.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${data.photoZoom || 1})`, objectPosition: `${data.photoX || 50}% ${data.photoY || 50}%` }} />
          </div>
        )}
        <div style={{ flex: 1, textAlign: data.photo ? 'left' : 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.fullName}</ProtectText>
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '0.6rem', justifyContent: data.photo ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
            <span>{data.email}</span>
            <span>•</span>
            <span>{data.phone}</span>
            <span>•</span>
            <span>{data.address}</span>
          </div>
        </div>
        <QRSection data={{ name: data.fullName, type: 'CV_VERIFIED' }} />
      </div>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '0.75rem' }}>Professional Summary</h2>
        <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.summary}</ProtectText>
        </p>
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '1rem' }}>Work Experience</h2>
        {data.experience?.map((exp, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}><span>{exp.title}</span><span>{exp.dates}</span></div>
            <p style={{ fontStyle: 'italic', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{exp.company}</p>
            <div style={{ fontSize: '0.85rem' }}><BulletList text={exp.tasks} /></div>
            {exp.achievement && <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>Achievement: {exp.achievement}</p>}
          </div>
        ))}
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '1rem' }}>Education & Training</h2>
        {data.education?.map((edu, i) => (
          <div key={i} style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}><span>{edu.degree}</span><span>{edu.dates}</span></div>
            <p style={{ fontSize: '0.85rem' }}>{edu.school}</p>
          </div>
        ))}
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '1rem' }}>Skills</h2>
        <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>
          <p><strong>Technical:</strong> {data.techSkills}</p>
          <p><strong>Soft Skills:</strong> {data.softSkills}</p>
        </div>
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '1rem' }}>Languages</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {data.languages?.split(/[,\n]/).map((lang, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{lang.trim()}</span>
              <ProficiencyInfographic level={lang} />
            </div>
          ))}
        </div>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '0.75rem' }}>Interests</h2>
          <div style={{ fontSize: '0.85rem' }}><BulletList text={data.hobbies} /></div>
        </section>
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid #6366f1', paddingLeft: '0.5rem', marginBottom: '0.75rem' }}>References</h2>
          <div style={{ fontSize: '0.85rem' }}>
            {Array.isArray(data.references) ? (
              data.references.map((ref, i) => (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                  <p><strong>{ref.name}</strong></p>
                  <p style={{ color: '#64748b' }}>{ref.org} | {ref.phone}</p>
                </div>
              ))
            ) : (
              <BulletList text={data.references} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ModernCV({ data, isPaid, isAdmin }) {
  const accentColor = data.accentColor || '#6366f1';
  const textColor = data.textColor || '#111827';
  if (!data) return null;
  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', color: textColor }}>
      <header style={{ background: '#f8fafc', padding: '2rem', margin: '-10mm -10mm 1.5rem', borderBottom: `4px solid ${accentColor}`, display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {data.photo && (
          <div style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <img src={data.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${data.photoZoom || 1})`, objectPosition: `${data.photoX || 50}% ${data.photoY || 50}%` }} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.fullName}</ProtectText>
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
            <span>{data.email}</span><span>•</span><span>{data.phone}</span><span>•</span><span>{data.address}</span>
          </div>
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="space-y-6">
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Summary</h2>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.summary}</ProtectText>
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Experience</h2>
            {data.experience?.map((exp, i) => (
              <div key={i} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{exp.title}</h3>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{exp.company} | {exp.dates}</div>
                <div style={{ fontSize: '0.85rem' }}><BulletList text={exp.tasks} /></div>
              </div>
            ))}
          </section>
        </div>
        <div className="space-y-6">
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Education</h2>
            {data.education?.map((edu, i) => (
              <div key={i} style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{edu.degree}</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{edu.school}</p>
              </div>
            ))}
          </section>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Expertise</h2>
            <div style={{ fontSize: '0.8rem', spaceY: '0.5rem' }}>
              <p><strong>Technical:</strong> {data.techSkills}</p>
              <p><strong>Soft:</strong> {data.softSkills}</p>
            </div>
          </section>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Languages</h2>
            <div className="space-y-3">
              {data.languages?.split(/[,\n]/).map((lang, idx) => (
                <div key={idx}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '2px' }}>{lang.trim()}</p>
                  <ProficiencyInfographic level={lang} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Interests</h2>
            <div style={{ fontSize: '0.85rem' }}><BulletList text={data.hobbies} /></div>
          </section>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>References</h2>
            <div style={{ fontSize: '0.85rem' }}>
              {Array.isArray(data.references) ? (
                data.references.map((ref, i) => (
                  <div key={i} style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontWeight: 700, color: '#0f172a' }}>{ref.name}</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{ref.org}</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{ref.phone}</p>
                  </div>
                ))
              ) : (
                <BulletList text={data.references} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const MinimalSection = ({ title, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
    <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', paddingTop: '0.2rem' }}>{title}</h2>
    <div>{children}</div>
  </div>
);

function MinimalCV({ data, isPaid, isAdmin }) {
  const accentColor = data.accentColor || '#6366f1';
  const textColor = data.textColor || '#111827';
  if (!data) return null;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '180mm', margin: '0 auto', color: textColor }}>
      <div style={{ marginBottom: '3rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, marginBottom: '0.5rem' }}>
            <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.fullName}</ProtectText>
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{data.email} • {data.phone} • {data.address}</div>
        </div>
        {data.photo && (
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img src={data.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)', transform: `scale(${data.photoZoom || 1})`, objectPosition: `${data.photoX || 50}% ${data.photoY || 50}%` }} />
          </div>
        )}
      </div>

      <MinimalSection title="Profile">
        <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          <ProtectText isPaid={isPaid} isAdmin={isAdmin}>{data.summary}</ProtectText>
        </p>
      </MinimalSection>

      <MinimalSection title="Experience">
        {data.experience?.map((exp, i) => (
          <div key={i} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{exp.title}</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{exp.dates}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>{exp.company}</div>
            <div style={{ fontSize: '0.85rem' }}><BulletList text={exp.tasks} /></div>
          </div>
        ))}
      </MinimalSection>

      <MinimalSection title="Education">
        {data.education?.map((edu, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{edu.degree} / {edu.school}</h3>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{edu.dates}</div>
          </div>
        ))}
      </MinimalSection>

      <MinimalSection title="Skills"><p style={{ fontSize: '0.85rem' }}>{data.techSkills}, {data.softSkills}</p></MinimalSection>
      <MinimalSection title="Languages">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {data.languages?.split(/[,\n]/).map((lang, idx) => (
            <div key={idx}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{lang.trim()}</span>
              <ProficiencyInfographic level={lang} color="#94a3b8" />
            </div>
          ))}
        </div>
      </MinimalSection>
      <MinimalSection title="Interests"><div style={{ fontSize: '0.85rem' }}><BulletList text={data.hobbies} /></div></MinimalSection>
      <MinimalSection title="References">
        <div style={{ fontSize: '0.85rem' }}>
          {Array.isArray(data.references) ? (
            data.references.map((ref, i) => (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontWeight: 600 }}>{ref.name}</p>
                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{ref.org} • {ref.phone}</p>
              </div>
            ))
          ) : (
            <BulletList text={data.references} />
          )}
        </div>
      </MinimalSection>
    </div>
  );
}

function ProfileModal({ onClose }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : { fullName: '', phone: '', email: '', address: '', companyName: '', companyAddress: '', companyPhone: '' };
  });

  const save = () => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
    onClose();
  };

  return (
    <div className="modal !max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">My Smart Profile</h2>
        <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
      </div>
      <p className="text-sm text-text-muted mb-6">Save your details here to auto-fill every document you create.</p>

      <div className="space-y-4 mb-8">
        <Input label="Full Name" value={profile.fullName} onChange={v => setProfile(p => ({ ...p, fullName: v }))} />
        <Input label="Email Address" value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} />
        <Input label="Phone Number" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} />
        <TextArea label="Residential Address" value={profile.address} onChange={v => setProfile(p => ({ ...p, address: v }))} />
        <hr className="border-card-border" />
        <Input label="Business/Company Name" value={profile.companyName} onChange={v => setProfile(p => ({ ...p, companyName: v }))} />
        <Input label="Business Phone" value={profile.companyPhone} onChange={v => setProfile(p => ({ ...p, companyPhone: v }))} />
        <TextArea label="Business Address" value={profile.companyAddress} onChange={v => setProfile(p => ({ ...p, companyAddress: v }))} />
      </div>

      <div className="flex gap-4">
        <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
        <button onClick={save} className="btn btn-primary flex-1">Save Profile</button>
      </div>
    </div>
  );
}

function getInitialData(id) {
  const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');

  const baseData = (typeId) => {
    if (typeId === 'cv') return {
      photo: null, photoZoom: 1, photoX: 50, photoY: 50,
      accentColor: '#6366f1', textColor: '#111827',
      fullName: profile.fullName || '', address: profile.address || '', phone: profile.phone || '', email: profile.email || '',
      dobGender: '', nationality: '', summary: '',
      experience: [{ id: Date.now(), title: '', company: '', dates: '', tasks: '', achievement: '' }],
      education: [{ id: Date.now() + 1, degree: '', school: '', dates: '' }],
      leadership: [{ id: Date.now() + 2, role: '', org: '', achievement: '' }],
      techSkills: '', softSkills: '', languages: '', hobbies: '',
      references: [{ id: Date.now() + 3, name: '', org: '', phone: '' }]
    };
    if (typeId === 'letter') return {
      accentColor: '#6366f1', textColor: '#111827',
      senderName: profile.fullName || '', senderEmail: profile.email || '', senderPhone: profile.phone || '', senderAddress: profile.address || '',
      date: new Date().toLocaleDateString('en-GB'),
      recipient: '', recipientTitle: '', company: '', companyAddress: '',
      subject: 'Application for the Position of...',
      body: 'Dear Hiring Manager,\n\nI am writing to express my enthusiastic interest in the [Job Title] position at [Company Name]...'
    };
    if (typeId === 'recommendation') return {
      recommenderName: profile.fullName || '', recommenderTitle: '', recommenderOrg: profile.companyName || '',
      candidateName: '', candidateTitle: '', body: ''
    };
    if (typeId === 'job_offer') return {
      companyName: profile.companyName || '', companyAddress: profile.companyAddress || '', companyPhone: profile.companyPhone || '',
      managerName: profile.fullName || '', candidateName: '', jobTitle: '', salary: '', startDate: '', welcomeMessage: ''
    };
    if (typeId === 'rent_receipt') return {
      receiptNo: `REC-${Date.now().toString().slice(-4)}`, date: new Date().toLocaleDateString('en-GB'),
      tenantName: '', landlordName: profile.fullName || '', amount: '', period: '', method: 'Cash'
    };
    if (typeId === 'tenancy') return {
      agreementDate: new Date().toLocaleDateString('en-GB'),
      landlordName: profile.fullName || '', landlordAddress: profile.address || '', landlordPhone: profile.phone || '',
      tenantName: '', tenantIdType: 'Ghana Card', tenantIdNumber: '', tenantPhone: '',
      propertyAddress: '', propertyDescription: 'Single Room Self Contained', termDuration: '1 Year',
      startDate: '', endDate: '', rentAmount: '500.00', paymentFrequency: 'Monthly',
      advancePayment: '6000.00', securityDeposit: '500.00',
      utilities: 'The Occupant shall pay for utilities such as refuse collection and electric power/water consumed.',
      otherTerms: '1. RENT ACT COMPLIANCE...\n[Standard Terms]',
      witness1Name: '', witness1Phone: '', witness1Address: '',
      witness2Name: '', witness2Phone: '', witness2Address: ''
    };
    if (typeId === 'shop_tenancy') return {
      agreementDate: new Date().toLocaleDateString('en-GB'),
      landlordName: profile.fullName || '', landlordAddress: profile.address || '', landlordPhone: profile.phone || '',
      tenantName: '', businessName: '', tenantIdType: 'Ghana Card', tenantIdNumber: '', tenantPhone: '',
      propertyAddress: '', propertyDescription: 'Steel Container', termDuration: '2 Years',
      startDate: '', endDate: '', rentAmount: '800.00', paymentFrequency: 'Monthly',
      advancePayment: '19200.00', securityDeposit: '1000.00',
      utilities: 'Responsible for commercial power and water.',
      otherTerms: '1. COMMERCIAL USE...\n[Standard Business Terms]',
      witness1Name: '', witness1Phone: '', witness1Address: '',
      witness2Name: '', witness2Phone: '', witness2Address: ''
    };
    if (typeId === 'invoice') return {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, date: new Date().toLocaleDateString('en-GB'),
      businessName: profile.companyName || '', businessAddress: profile.companyAddress || '', businessPhone: profile.companyPhone || '',
      businessEmail: profile.email || '', businessTin: '', businessLogo: null,
      showWatermark: false, watermarkType: 'text',
      customerName: '', customerAddress: '', customerPhone: '',
      items: [{ id: Date.now(), desc: '', qty: '', price: '' }], taxRate: 0, notes: 'Thank you for your business!'
    };
    if (typeId === 'leave_permission') return {
      companyName: profile.companyName || '', companyAddress: profile.companyAddress || '', companyPhone: profile.companyPhone || '',
      employeeName: '', employeeId: '', department: '', position: '', reason: '',
      startDate: '', endDate: '', totalDays: '', contactWhileAbsent: '',
      requestDate: new Date().toLocaleDateString('en-GB'), managerName: profile.fullName || '', status: 'Pending'
    };
    if (typeId === 'employment_contract') return {
      employerName: profile.companyName || profile.fullName || '',
      employerAddress: profile.companyAddress || profile.address || '',
      employeeName: '', employeeAddress: '', employeeIdType: 'Ghana Card', employeeIdNumber: '',
      jobTitle: '', department: '', commencementDate: '', probationPeriod: '3 Months',
      salaryAmount: '', workingHours: '8:00 AM - 5:00 PM', annualLeave: '15 Days', noticePeriod: '1 Month',
      contractDate: new Date().toLocaleDateString('en-GB')
    };
    if (typeId === 'qr_code') return {
      label: 'My Custom QR',
      content: 'https://sparkdocs.com'
    };
    return { data: '' };
  };

  return baseData(id);
}
