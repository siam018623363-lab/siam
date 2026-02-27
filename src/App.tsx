/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  Printer, 
  Share2, 
  RefreshCw,
  Globe,
  Layout,
  Palette,
  Video,
  FileText,
  Star,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Settings,
  Save,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SERVICES as INITIAL_SERVICES, 
  DOMAINS, 
  HOSTING_PLANS, 
  COUPONS, 
  DISTRICTS,
  type Service 
} from './data';
import { supabase } from './lib/supabase';

interface CartItem extends Service {
  quantity: number;
  type: 'service' | 'domain' | 'hosting';
  domainExtension?: string;
  hostingPlan?: string;
  hostingDuration?: string;
}

interface CheckoutData {
  fullName: string;
  mobile: string;
  email: string;
  whatsappSame: boolean;
  whatsapp: string;
  businessName: string;
  businessType: string;
  businessLink: string;
  district: string;
  upazila: string;
  address: string;
  startDate: string;
  instructions: string;
  source: string;
}

export default function App() {
  const [view, setView] = useState<'services' | 'checkout' | 'invoice' | 'admin'>('services');
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('সব সার্ভিস');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [showAddonModal, setShowAddonModal] = useState<Service | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [premiumDurations, setPremiumDurations] = useState<Record<string, string>>({});
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    category: 'ডিজিটাল মার্কেটিং',
    icon: '✨',
    originalPrice: 0,
    discountPrice: 0,
    description: '',
    searchTags: []
  });
  
  const [formData, setFormData] = useState<CheckoutData>({
    fullName: '',
    mobile: '',
    email: '',
    whatsappSame: true,
    whatsapp: '',
    businessName: '',
    businessType: '',
    businessLink: '',
    district: '',
    upazila: '',
    address: '',
    startDate: '',
    instructions: '',
    source: ''
  });

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch services from Supabase
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Map snake_case from DB to camelCase for app
        const mappedData = data.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          icon: s.icon,
          originalPrice: s.original_price,
          discountPrice: s.discount_price,
          description: s.description,
          searchTags: s.search_tags || [],
          durations: s.durations || null
        }));
        setServices(mappedData);
      } else {
        // If no data, maybe seed it?
        console.log('No services found in Supabase, using initial data.');
      }
    } catch (err: any) {
      console.error('Error fetching services:', err);
      if (err.code === 'PGRST116' || err.message?.includes('relation "services" does not exist')) {
        showToast('ডেটাবেজ টেবিল পাওয়া যায়নি। অ্যাডমিন প্যানেল থেকে SQL সেটআপ করুন।', 'error');
      } else {
        showToast('সুপাবেজ থেকে তথ্য লোড করতে সমস্যা হয়েছে', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    setLoading(true);
    try {
      const seedData = INITIAL_SERVICES.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        icon: s.icon,
        original_price: s.originalPrice,
        discount_price: s.discountPrice,
        description: s.description,
        search_tags: s.searchTags,
        durations: s.durations || null
      }));

      const { error } = await supabase
        .from('services')
        .upsert(seedData, { onConflict: 'id' });

      if (error) throw error;
      showToast('ডেটাবেজ সফলভাবে আপডেট হয়েছে!', 'success');
      fetchServices();
    } catch (err) {
      console.error('Error seeding database:', err);
      showToast('ডেটাবেজ আপডেট করতে সমস্যা হয়েছে। টেবিল তৈরি করা আছে কি?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateServicePrice = async (id: string, originalPrice: number, discountPrice: number) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ original_price: originalPrice, discount_price: discountPrice })
        .eq('id', id);

      if (error) throw error;
      
      setServices(services.map(s => s.id === id ? { ...s, originalPrice, discountPrice } : s));
      showToast('মূল্য আপডেট হয়েছে!', 'success');
    } catch (err) {
      console.error('Error updating price:', err);
      showToast('মূল্য আপডেট করতে সমস্যা হয়েছে', 'error');
    }
  };

  const addNewService = async () => {
    if (!newService.name || !newService.category || !newService.originalPrice || !newService.discountPrice) {
      showToast('⚠️ সব তথ্য পূরণ করুন', 'error');
      return;
    }

    setLoading(true);
    try {
      const id = `custom-${Date.now()}`;
      const serviceToAdd = {
        id,
        name: newService.name,
        category: newService.category,
        icon: newService.icon || '✨',
        original_price: newService.originalPrice,
        discount_price: newService.discountPrice,
        description: newService.description || '',
        search_tags: newService.searchTags || [],
        durations: null
      };

      const { error } = await supabase
        .from('services')
        .insert([serviceToAdd]);

      if (error) throw error;

      showToast('✅ নতুন সার্ভিস যোগ হয়েছে!', 'success');
      setShowAddServiceModal(false);
      setNewService({
        name: '',
        category: 'ডিজিটাল মার্কেটিং',
        icon: '✨',
        originalPrice: 0,
        discountPrice: 0,
        description: '',
        searchTags: []
      });
      fetchServices();
    } catch (err) {
      console.error('Error adding service:', err);
      showToast('সার্ভিস যোগ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(query) || 
                           s.category.toLowerCase().includes(query) ||
                           s.searchTags.some(tag => tag.toLowerCase().includes(query));
      const matchesCategory = activeCategory === 'সব সার্ভিস' || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, services]);

  // Cart logic
  const addToCart = (service: Service, isAddon = false) => {
    const duration = premiumDurations[service.id] || '1m';
    const price = service.durations ? service.durations[duration] : service.discountPrice;
    const durationLabel = service.durations ? (duration === '1m' ? '১ মাস' : duration === '3m' ? '৩ মাস' : duration === '6m' ? '৬ মাস' : '১২ মাস') : '';
    
    const cartId = service.durations ? `${service.id}-${duration}` : service.id;
    const existing = cart.find(item => item.id === cartId);

    if (existing) {
      setCart(cart.map(item => item.id === cartId ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { 
        ...service, 
        id: cartId, 
        discountPrice: price, 
        quantity: 1, 
        type: 'service',
        hostingDuration: durationLabel
      }]);
    }
    
    if (!isAddon) {
      showToast('✅ কার্টে যোগ হয়েছে!', 'success');
      if (service.category === 'ওয়েবসাইট ডিজাইন') {
        setShowAddonModal(service);
      }
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    showToast('🗑️ সার্ভিস সরানো হয়েছে', 'info');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Pricing calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.discountPrice * item.quantity), 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discount) / 100 : 0;
  const total = subtotal - discountAmount;

  // Coupon logic
  const applyCoupon = () => {
    const coupon = COUPONS[couponCode.toUpperCase()];
    if (coupon) {
      setAppliedCoupon({ code: couponCode.toUpperCase(), discount: coupon.discount, label: coupon.label });
      setCouponSuccess(`🎉 ${coupon.label} প্রয়োগ হয়েছে!`);
      setCouponError('');
      showToast(`🎉 ${coupon.label} প্রয়োগ হয়েছে!`, 'success');
    } else {
      setCouponError('❌ অবৈধ কুপন কোড');
      setCouponSuccess('');
      showToast('❌ অবৈধ কুপন কোড', 'error');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    showToast('🗑️ কুপন সরানো হয়েছে', 'info');
  };

  // Order submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.fullName || !formData.mobile || !formData.businessName || !formData.district || !formData.startDate) {
      showToast('⚠️ সব তারকা চিহ্নিত তথ্য পূরণ করুন', 'error');
      return;
    }

    setLoading(true);
    try {
      // Generate invoice details
      const invNum = `BSE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Save to Supabase
      const { error } = await supabase
        .from('orders')
        .insert([{
          invoice_number: invNum,
          full_name: formData.fullName,
          mobile: formData.mobile,
          email: formData.email,
          business_name: formData.businessName,
          business_type: formData.businessType,
          district: formData.district,
          total_amount: total,
          items: cart,
          status: 'pending'
        }]);

      if (error) throw error;

      setInvoiceNumber(invNum);
      setOrderDate(new Date().toLocaleString('bn-BD'));
      
      showToast('🎊 অর্ডার সফলভাবে নিবন্ধিত হয়েছে!', 'success');
      setTimeout(() => {
        setView('invoice');
        window.scrollTo(0, 0);
      }, 1500);
    } catch (err) {
      console.error('Error saving order:', err);
      showToast('অর্ডার সেভ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddons = (domain: string, hosting: string, duration: string) => {
    const newItems: CartItem[] = [];
    
    if (domain !== 'skip') {
      const d = DOMAINS.find(dm => dm.name === domain);
      if (d) {
        newItems.push({
          id: `domain-${domain}`,
          name: `ডোমেইন (${domain})`,
          category: 'ডোমেইন',
          icon: '🌐',
          originalPrice: d.price,
          discountPrice: d.price,
          quantity: 1,
          type: 'domain',
          description: '১ বছরের জন্য ডোমেইন রেজিস্ট্রেশন',
          searchTags: ['domain', 'ডোমেইন', domain]
        });
      }
    }

    if (hosting !== 'skip') {
      const h = HOSTING_PLANS.find(hp => hp.name === hosting);
      if (h) {
        const price = h.prices[duration as keyof typeof h.prices];
        newItems.push({
          id: `hosting-${hosting}-${duration}`,
          name: `হোস্টিং (${hosting}) - ${duration === '1m' ? '১ মাস' : duration === '3m' ? '৩ মাস' : duration === '6m' ? '৬ মাস' : '১ বছর'}`,
          category: 'হোস্টিং',
          icon: '☁️',
          originalPrice: price,
          discountPrice: price,
          quantity: 1,
          type: 'hosting',
          description: `${duration} মেয়াদের হোস্টিং প্যাকেজ`,
          searchTags: ['hosting', 'হোস্টিং', hosting]
        });
      }
    }

    setCart([...cart, ...newItems]);
    setShowAddonModal(null);
    showToast('✅ অ্যাড-অন যোগ করা হয়েছে!', 'success');
  };

  const handleWhatsAppShare = () => {
    const message = `নতুন অর্ডার ইনভয়েস: ${invoiceNumber}\nমোট মূল্য: ৳${total.toLocaleString('bn-BD')}\nক্লায়েন্ট: ${formData.fullName}\nমোবাইল: ${formData.mobile}`;
    window.open(`https://wa.me/8801843067118?text=${encodeURIComponent(message)}`, '_blank');
  };

  const downloadInvoicePDF = () => {
    const element = document.getElementById('invoice-paper');
    if (!element) return;

    if (typeof (window as any).html2pdf === 'undefined') {
      window.print();
      return;
    }

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `BSE-Invoice-${invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    showToast('⏳ PDF তৈরি হচ্ছে, অপেক্ষা করুন...', 'info');

    (window as any).html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        showToast('✅ PDF ডাউনলোড হয়েছে!', 'success');
      })
      .catch((err: any) => {
        console.error(err);
        showToast('❌ PDF তৈরিতে সমস্যা হয়েছে', 'error');
      });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg text-white font-medium flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-success' : toast.type === 'error' ? 'bg-danger' : 'bg-gray-600'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('services')}
              className="text-left"
            >
              <h1 className="text-3xl font-bold text-sky-blue">Best Solution Experts</h1>
              <p className="text-sm text-text-muted">আমাদের সকল সার্ভিস ও মূল্য তালিকা</p>
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`p-2 rounded-lg transition-colors ${view === 'admin' ? 'bg-sky-blue text-white' : 'text-text-muted hover:bg-gray-100'}`}
              title="অ্যাডমিন প্যানেল"
            >
              <Settings size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 bg-sky-light rounded-full text-sky-blue hover:bg-sky-blue hover:text-white transition-colors"
          >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-brand text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {loading && view !== 'invoice' && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[90] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="animate-spin text-sky-blue" size={48} />
              <p className="font-bold text-sky-blue">লোড হচ্ছে...</p>
            </div>
          </div>
        )}

        {view === 'services' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Search & Filter */}
            <div className="mb-8 space-y-6">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="সার্ভিস খুঁজুন... যেমন: logo / লোগো, SEO, website / ওয়েবসাইট"
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-border rounded-2xl focus:border-sky-blue outline-none transition-all text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {['সব সার্ভিস', 'ডিজিটাল মার্কেটিং', 'ওয়েবসাইট ডিজাইন', 'গ্রাফিক্স ডিজাইন', 'ভিডিও এডিটিং', 'টেমপ্লেট ও থিম', 'প্রিমিয়াম সাবস্ক্রিপশন', 'প্রিমিয়াম প্লাগিন', 'সাবস্ক্রিপশন প্ল্যান'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-full border-2 transition-all font-medium ${
                      activeCategory === cat 
                        ? 'bg-sky-blue border-sky-blue text-white shadow-md' 
                        : 'bg-white border-border text-text-muted hover:border-sky-blue hover:text-sky-blue'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Grid */}
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredServices.map(service => {
                  const isInCart = cart.some(item => item.id === service.id);
                  return (
                    <motion.div 
                      layout
                      key={service.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-2xl border border-border p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl">{service.icon}</span>
                        <span className="px-3 py-1 bg-sky-light text-sky-blue text-xs font-bold rounded-full uppercase">
                          {service.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-sky-blue transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-text-muted text-sm mb-4 flex-grow">
                        {service.description}
                      </p>

                      {service.durations && (
                        <div className="mb-4">
                          <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                            {Object.keys(service.durations).map(dur => (
                              <button
                                key={dur}
                                onClick={() => setPremiumDurations(prev => ({ ...prev, [service.id]: dur }))}
                                className={`flex-grow py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  (premiumDurations[service.id] || '1m') === dur 
                                    ? 'bg-white text-sky-blue shadow-sm' 
                                    : 'text-text-muted hover:text-sky-blue'
                                }`}
                              >
                                {dur === '1m' ? '১ মাস' : dur === '3m' ? '৩ মাস' : dur === '6m' ? '৬ মাস' : '১২ মাস'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t border-dashed border-border pt-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-old-price line-through">
                            ৳{(service.durations 
                              ? (service.originalPrice * (Number((premiumDurations[service.id] || '1m').replace('m', '')) || 1)) 
                              : service.originalPrice).toLocaleString('bn-BD')}
                          </span>
                          <span className="px-2 py-0.5 bg-orange-light text-orange-brand text-[10px] font-bold rounded">
                            সঞ্চয়: ৳{(
                              (service.durations 
                                ? (service.originalPrice * (Number((premiumDurations[service.id] || '1m').replace('m', '')) || 1)) 
                                : service.originalPrice) - 
                              (service.durations 
                                ? service.durations[premiumDurations[service.id] || '1m'] 
                                : service.discountPrice)
                            ).toLocaleString('bn-BD')}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-success">
                          ✅ ৳{(service.durations 
                            ? service.durations[premiumDurations[service.id] || '1m'] 
                            : service.discountPrice).toLocaleString('bn-BD')}
                        </div>
                      </div>

                      <button 
                        onClick={() => addToCart(service)}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          isInCart 
                            ? 'bg-orange-brand text-white shadow-lg' 
                            : 'bg-sky-blue text-white hover:bg-sky-blue/90 shadow-md'
                        }`}
                      >
                        {isInCart ? (
                          <><CheckCircle2 size={20} /> ✓ যোগ করা হয়েছে</>
                        ) : (
                          <><ShoppingCart size={20} /> কার্টে যোগ করুন</>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-text-muted">কোনো সার্ভিস পাওয়া যায়নি</h3>
                <p className="text-gray-400">অন্য কোনো নাম দিয়ে সার্চ করে দেখুন</p>
              </div>
            )}
          </div>
        )}

        {view === 'checkout' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Form */}
              <div className="flex-grow">
                <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
                  <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                    <FileText className="text-sky-blue" /> চেকআউট ফর্ম
                  </h2>
                  
                  <form onSubmit={handleSubmitOrder} className="space-y-8">
                    {/* Personal Info */}
                    <section>
                      <h3 className="text-lg font-bold mb-4 text-sky-blue border-b border-sky-light pb-2">ব্যক্তিগত তথ্য</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">পূর্ণ নাম *</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">মোবাইল নম্বর *</label>
                          <div className="flex">
                            <span className="bg-gray-100 border border-r-0 border-border px-3 flex items-center rounded-l-xl text-gray-500">+৮৮</span>
                            <input 
                              required
                              type="tel" 
                              placeholder="০১XXXXXXXXX"
                              className="w-full p-3 border border-border rounded-r-xl focus:border-sky-blue outline-none"
                              value={formData.mobile}
                              onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">ইমেইল ঠিকানা (ঐচ্ছিক)</label>
                          <input 
                            type="email" 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">WhatsApp নম্বর</label>
                          <div className="flex items-center gap-2 mb-2">
                            <input 
                              type="checkbox" 
                              id="wa-same"
                              checked={formData.whatsappSame}
                              onChange={(e) => setFormData({...formData, whatsappSame: e.target.checked, whatsapp: e.target.checked ? formData.mobile : formData.whatsapp})}
                            />
                            <label htmlFor="wa-same" className="text-xs text-text-muted">মোবাইলের মতো হলে টিক করুন</label>
                          </div>
                          {!formData.whatsappSame && (
                            <input 
                              type="tel" 
                              className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                              value={formData.whatsapp}
                              onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                            />
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Business Info */}
                    <section>
                      <h3 className="text-lg font-bold mb-4 text-sky-blue border-b border-sky-light pb-2">ব্যবসায়িক তথ্য</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">ব্যবসা প্রতিষ্ঠানের নাম *</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.businessName}
                            onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">ব্যবসার ধরন</label>
                          <select 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.businessType}
                            onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                          >
                            <option value="">নির্বাচন করুন</option>
                            <option value="ই-কমার্স">ই-কমার্স</option>
                            <option value="রেস্টুরেন্ট">রেস্টুরেন্ট</option>
                            <option value="শিক্ষা প্রতিষ্ঠান">শিক্ষা প্রতিষ্ঠান</option>
                            <option value="সার্ভিস">সার্ভিস</option>
                            <option value="অন্যান্য">অন্যান্য</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-sm font-medium">বিজনেস ওয়েবসাইট/Facebook পেজ লিংক (ঐচ্ছিক)</label>
                          <input 
                            type="url" 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.businessLink}
                            onChange={(e) => setFormData({...formData, businessLink: e.target.value})}
                          />
                        </div>
                      </div>
                    </section>

                    {/* Address */}
                    <section>
                      <h3 className="text-lg font-bold mb-4 text-sky-blue border-b border-sky-light pb-2">ঠিকানা</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">জেলা *</label>
                          <select 
                            required
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.district}
                            onChange={(e) => setFormData({...formData, district: e.target.value})}
                          >
                            <option value="">জেলা নির্বাচন করুন</option>
                            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">উপজেলা/থানা</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.upazila}
                            onChange={(e) => setFormData({...formData, upazila: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-sm font-medium">বিস্তারিত ঠিকানা</label>
                          <textarea 
                            rows={2}
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none resize-none"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                          ></textarea>
                        </div>
                      </div>
                    </section>

                    {/* Service Details */}
                    <section>
                      <h3 className="text-lg font-bold mb-4 text-sky-blue border-b border-sky-light pb-2">সার্ভিস বিষয়ক</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">সার্ভিস শুরুর পছন্দের তারিখ *</label>
                          <input 
                            required
                            type="date" 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.startDate}
                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">কিভাবে জানলেন?</label>
                          <select 
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none"
                            value={formData.source}
                            onChange={(e) => setFormData({...formData, source: e.target.value})}
                          >
                            <option value="">নির্বাচন করুন</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Google">Google</option>
                            <option value="বন্ধু">বন্ধু</option>
                            <option value="অন্যান্য">অন্যান্য</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-sm font-medium">বিশেষ নির্দেশনা / মন্তব্য</label>
                          <textarea 
                            rows={3}
                            className="w-full p-3 border border-border rounded-xl focus:border-sky-blue outline-none resize-none"
                            value={formData.instructions}
                            onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                          ></textarea>
                        </div>
                      </div>
                    </section>

                    <button 
                      type="submit"
                      className="w-full py-4 bg-orange-brand text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-orange-brand/90 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={24} /> অর্ডার নিশ্চিত করুন
                    </button>
                  </form>
                </div>
              </div>

              {/* Sticky Summary */}
              <div className="lg:w-96">
                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm sticky top-24">
                  <h3 className="text-xl font-bold mb-6">অর্ডার সামারি</h3>
                  <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between gap-4">
                        <div className="flex gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <p className="text-sm font-bold leading-tight">{item.name}</p>
                            <p className="text-[10px] text-text-muted">{item.category} x {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold">৳{(item.discountPrice * item.quantity).toLocaleString('bn-BD')}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">সাবটোটাল:</span>
                      <span className="font-bold">৳{subtotal.toLocaleString('bn-BD')}</span>
                    </div>
                    
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-success">
                        <span className="flex items-center gap-1">
                          কুপন ডিসকাউন্ট ({appliedCoupon.discount}%):
                          <button onClick={removeCoupon} className="text-danger hover:scale-110 transition-transform"><X size={14}/></button>
                        </span>
                        <span className="font-bold">- ৳{discountAmount.toLocaleString('bn-BD')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xl font-bold text-sky-blue pt-2 border-t border-border">
                      <span>মোট মূল্য:</span>
                      <span>৳{total.toLocaleString('bn-BD')}</span>
                    </div>
                  </div>

                  {/* Coupon Input */}
                  <div className="mt-6">
                    <label className="text-xs font-bold text-text-muted mb-2 block">কুপন কোড আছে?</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="কোড লিখুন"
                        className="flex-grow p-2 border border-border rounded-lg outline-none focus:border-sky-blue uppercase text-sm"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                      <button 
                        onClick={applyCoupon}
                        className="px-4 py-2 bg-sky-blue text-white text-sm font-bold rounded-lg hover:bg-sky-blue/90"
                      >
                        এপ্লাই
                      </button>
                    </div>
                    {couponError && <p className="text-[10px] text-danger mt-1">{couponError}</p>}
                    {couponSuccess && <p className="text-[10px] text-success mt-1">{couponSuccess}</p>}
                  </div>

                  <button 
                    onClick={() => setView('services')}
                    className="w-full mt-6 py-2 text-sky-blue text-sm font-bold hover:underline"
                  >
                    কেনাকাটা চালিয়ে যান
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-sky-blue">অ্যাডমিন প্যানেল</h2>
                <p className="text-text-muted">এখান থেকে সার্ভিসের মূল্য পরিবর্তন করুন</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const sql = `
-- 1. Create Services Table
create table if not exists services (
  id text primary key,
  name text not null,
  category text not null,
  icon text,
  original_price numeric not null,
  discount_price numeric not null,
  description text,
  search_tags text[] default '{}',
  durations jsonb
);

-- 2. Create Orders Table
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  invoice_number text unique not null,
  full_name text not null,
  mobile text not null,
  email text,
  business_name text,
  business_type text,
  district text,
  total_amount numeric not null,
  items jsonb not null,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- 3. Enable RLS (Optional but recommended)
alter table services enable row level security;
alter table orders enable row level security;

-- 4. Create Policies (Allow all for demo)
do $$ 
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all' and tablename = 'services') then
    create policy "Allow all" on services for all using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow all' and tablename = 'orders') then
    create policy "Allow all" on orders for all using (true);
  end if;
end $$;
                    `;
                    navigator.clipboard.writeText(sql);
                    showToast('SQL কোড কপি হয়েছে! সুপাবেজ SQL এডিটরে পেস্ট করুন।', 'info');
                  }}
                  className="px-4 py-2 border-2 border-sky-blue text-sky-blue rounded-xl font-bold hover:bg-sky-light transition-all"
                >
                  SQL সেটআপ কপি করুন
                </button>
                <button 
                  onClick={fetchServices}
                  className="p-2 text-sky-blue hover:bg-sky-light rounded-xl transition-all border border-sky-blue/20"
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setShowAddServiceModal(true)}
                  className="px-6 py-2 bg-success text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-success/90"
                >
                  <Plus size={20} /> নতুন সার্ভিস
                </button>
                <button 
                  onClick={seedDatabase}
                  className="px-6 py-2 bg-sky-blue text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-sky-blue/90"
                >
                  <Database size={20} /> ডেটাবেজ সিঙ্ক করুন
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sky-light/50 text-sky-blue uppercase text-xs font-black">
                    <th className="p-4">সার্ভিস</th>
                    <th className="p-4">ক্যাটাগরি</th>
                    <th className="p-4">পুরনো মূল্য (৳)</th>
                    <th className="p-4">ডিসকাউন্ট মূল্য (৳)</th>
                    <th className="p-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {services.map(service => (
                    <AdminRow 
                      key={service.id} 
                      service={service} 
                      onUpdate={updateServicePrice} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'invoice' && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div id="invoice-paper" className="bg-white border-2 border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Invoice Header */}
              <div className="bg-sky-blue p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h1 className="text-4xl font-black mb-1">Best Solution Experts</h1>
                  <p className="text-sky-light font-medium">Digital Marketing & Technology Agency</p>
                </div>
                <div className="text-center md:text-right space-y-1 text-sm">
                  <p className="flex items-center justify-center md:justify-end gap-2"><Phone size={14}/> ০১৮৪৩০৬৭১১৮</p>
                  <p className="flex items-center justify-center md:justify-end gap-2"><Globe size={14}/> www.bestsolutionexperts.com</p>
                  <p className="flex items-center justify-center md:justify-end gap-2"><Mail size={14}/> info@bestsolutionexperts.com</p>
                </div>
              </div>

              <div className="p-8">
                {/* Invoice Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-border">
                  <div className="space-y-2">
                    <div className="flex justify-between md:justify-start md:gap-4">
                      <span className="text-text-muted font-bold">ইনভয়েস নং:</span>
                      <span className="font-bold text-sky-blue">{invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between md:justify-start md:gap-4">
                      <span className="text-text-muted font-bold">তারিখ:</span>
                      <span className="font-medium">{orderDate}</span>
                    </div>
                    <div className="flex justify-between md:justify-start md:gap-4">
                      <span className="text-text-muted font-bold">পেমেন্ট স্ট্যাটাস:</span>
                      <span className="px-2 py-0.5 bg-orange-light text-orange-brand text-xs font-bold rounded">⏳ পেমেন্ট বাকি আছে</span>
                    </div>
                  </div>
                  <div className="bg-sky-light/30 p-4 rounded-xl space-y-1">
                    <h4 className="text-sky-blue font-bold mb-2 flex items-center gap-2"><Star size={16}/> ক্লায়েন্টের তথ্য:</h4>
                    <p><span className="text-text-muted text-xs">নাম:</span> <span className="font-bold">{formData.fullName}</span></p>
                    <p><span className="text-text-muted text-xs">মোবাইল:</span> <span className="font-bold">{formData.mobile}</span></p>
                    <p><span className="text-text-muted text-xs">প্রতিষ্ঠান:</span> <span className="font-bold">{formData.businessName}</span></p>
                    <p><span className="text-text-muted text-xs">ঠিকানা:</span> <span className="font-medium">{formData.address}, {formData.district}</span></p>
                  </div>
                </div>

                {/* Table */}
                <div className="mb-8 overflow-x-auto">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2"><Layout size={18} className="text-sky-blue"/> বুক করা সার্ভিস:</h4>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-sky-light/50 text-sky-blue uppercase text-xs font-black">
                        <th className="p-4 rounded-l-lg">ক্রমিক</th>
                        <th className="p-4">সার্ভিস নাম</th>
                        <th className="p-4 text-center">পরিমাণ</th>
                        <th className="p-4 text-right rounded-r-lg">মূল্য</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {cart.map((item, idx) => (
                        <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-bold text-text-muted">{idx + 1}</td>
                          <td className="p-4">
                            <div className="font-bold">{item.name}</div>
                            <div className="text-[10px] text-text-muted">{item.category}</div>
                          </td>
                          <td className="p-4 text-center font-bold">{item.quantity}</td>
                          <td className="p-4 text-right font-bold">৳{(item.discountPrice * item.quantity).toLocaleString('bn-BD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end space-y-2 mb-12">
                  <div className="w-full md:w-64 flex justify-between text-sm">
                    <span className="text-text-muted font-bold">সাবটোটাল:</span>
                    <span className="font-bold">৳{subtotal.toLocaleString('bn-BD')}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="w-full md:w-64 flex justify-between text-sm text-success">
                      <span className="font-bold">কুপন ডিসকাউন্ট ({appliedCoupon.discount}%):</span>
                      <span className="font-bold">- ৳{discountAmount.toLocaleString('bn-BD')}</span>
                    </div>
                  )}
                  <div className="w-full md:w-64 flex justify-between text-2xl font-black text-sky-blue pt-4 border-t-2 border-sky-blue">
                    <span>মোট দেয়:</span>
                    <span>৳{total.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* Warranty & Support */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="bg-orange-light/30 p-6 rounded-2xl border border-orange-brand/20">
                    <h4 className="text-orange-brand font-bold mb-4 flex items-center gap-2">🛡️ আফটার সেল সার্ভিস ও ওয়ারেন্টি</h4>
                    <ul className="space-y-2 text-xs font-medium">
                      <li className="flex items-start gap-2">✅ <span className="flex-grow">৩০ দিনের বিনামূল্যে সাপোর্ট</span></li>
                      <li className="flex items-start gap-2">✅ <span className="flex-grow">৭ দিনের মধ্যে আনলিমিটেড ছোট রিভিশন</span></li>
                      <li className="flex items-start gap-2">✅ <span className="flex-grow">৬ মাস পর্যন্ত টেকনিক্যাল সাপোর্ট</span></li>
                      <li className="flex items-start gap-2">✅ <span className="flex-grow">সম্পূর্ণ কাজ হস্তান্তরের গ্যারান্টি</span></li>
                      <li className="flex items-start gap-2">✅ <span className="flex-grow">সোর্স ফাইল সম্পূর্ণ দেওয়া হবে</span></li>
                      <li className="flex items-start gap-2">✅ <span className="flex-grow">WhatsApp-এ ২৪/৭ সাপোর্ট পাবেন</span></li>
                      <li className="flex items-start gap-2">⚠️ <span className="flex-grow">বড় পরিবর্তনে অতিরিক্ত চার্জ প্রযোজ্য</span></li>
                      <li className="flex items-start gap-2">⚠️ <span className="flex-grow">কাজ শুরুর আগে ৫০% অগ্রিম পেমেন্ট</span></li>
                    </ul>
                  </div>
                  <div className="bg-sky-light/20 p-6 rounded-2xl border border-sky-blue/20">
                    <h4 className="text-sky-blue font-bold mb-4 flex items-center gap-2">💳 পেমেন্ট পদ্ধতি</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-border">
                        <span className="font-bold text-pink-600">bKash (Personal)</span>
                        <span className="font-mono font-bold">০১৮৪৩০৬৭১১৮</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-border">
                        <span className="font-bold text-orange-600">Nagad</span>
                        <span className="font-mono font-bold">০১৮৪৩০৬৭১১৮</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-border">
                        <span className="font-bold text-purple-700">Rocket</span>
                        <span className="font-mono font-bold">০১৮৪৩০৬৭১১৮</span>
                      </div>
                      <p className="text-[10px] text-text-muted text-center italic">ব্যাংক ট্রান্সফারের জন্য যোগাযোগ করুন</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center space-y-4 pt-8 border-t border-border">
                  <p className="text-lg font-bold text-sky-blue">ধন্যবাদ! Best Solution Experts — আপনার পাশে। 🙏</p>
                  <p className="text-sm text-text-muted">আমরা আপনার সাফল্যে বিশ্বাস করি।</p>
                  <div className="flex justify-center gap-6 text-sky-blue font-bold text-xs">
                    <span className="flex items-center gap-1"><Phone size={12}/> ০১৮৪৩০৬৭১১৮</span>
                    <span className="flex items-center gap-1"><Globe size={12}/> www.bestsolutionexperts.com</span>
                    <span className="flex items-center gap-1"><Share2 size={12}/> Best Solution Experts</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Best Solution Experts — আপনার ডিজিটাল অংশীদার</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 no-print">
              <button 
                onClick={downloadInvoicePDF}
                id="download-pdf-btn"
                className="px-8 py-3 bg-sky-blue text-white font-bold rounded-xl shadow-lg hover:bg-sky-blue/90 flex items-center gap-2 transition-all"
              >
                <Printer size={20} /> PDF ডাউনলোড করুন
              </button>
              <button 
                onClick={handleWhatsAppShare}
                className="px-8 py-3 bg-success text-white font-bold rounded-xl shadow-lg hover:bg-success/90 flex items-center gap-2 transition-all"
              >
                <Share2 size={20} /> WhatsApp-এ পাঠান
              </button>
              <button 
                onClick={() => {
                  setView('services');
                  setCart([]);
                  setAppliedCoupon(null);
                  setFormData({
                    fullName: '', mobile: '', email: '', whatsappSame: true, whatsapp: '',
                    businessName: '', businessType: '', businessLink: '', district: '',
                    upazila: '', address: '', startDate: '', instructions: '', source: ''
                  });
                }}
                className="px-8 py-3 bg-white border-2 border-border text-text-muted font-bold rounded-xl hover:border-sky-blue hover:text-sky-blue flex items-center gap-2 transition-all"
              >
                <RefreshCw size={20} /> নতুন অর্ডার করুন
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-sky-light/30">
                <h2 className="text-2xl font-bold text-sky-blue flex items-center gap-2">
                  <ShoppingCart /> আপনার কার্ট
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {cart.length > 0 ? (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 bg-gray-50 p-4 rounded-2xl border border-border group">
                      <span className="text-4xl">{item.icon}</span>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold leading-tight">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-danger transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 bg-sky-light text-sky-blue rounded-full font-bold uppercase">
                            {item.category}
                          </span>
                          {item.hostingDuration && (
                            <span className="text-[10px] px-2 py-0.5 bg-orange-light text-orange-brand rounded-full font-bold uppercase">
                              {item.hostingDuration}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-white border border-border rounded-lg px-2 py-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-sky-blue hover:scale-125 transition-transform"><Minus size={16}/></button>
                            <span className="font-bold min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-sky-blue hover:scale-125 transition-transform"><Plus size={16}/></button>
                          </div>
                          <p className="font-bold text-success">৳{(item.discountPrice * item.quantity).toLocaleString('bn-BD')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-20">🛒</div>
                    <p className="text-text-muted font-medium">আপনার কার্ট খালি</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-sky-blue font-bold hover:underline"
                    >
                      সার্ভিস দেখুন
                    </button>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-border bg-gray-50 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">সাবটোটাল:</span>
                      <span className="font-bold">৳{subtotal.toLocaleString('bn-BD')}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-success">
                        <span>কুপন ডিসকাউন্ট ({appliedCoupon.discount}%):</span>
                        <span className="font-bold">- ৳{discountAmount.toLocaleString('bn-BD')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-2xl font-bold text-sky-blue pt-2 border-t border-border">
                      <span>মোট মূল্য:</span>
                      <span>৳{total.toLocaleString('bn-BD')}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      setView('checkout');
                    }}
                    className="w-full py-4 bg-orange-brand text-white text-lg font-bold rounded-2xl shadow-lg hover:bg-orange-brand/90 transition-all flex items-center justify-center gap-2"
                  >
                    চেকআউট করুন <ArrowRight size={20} />
                  </button>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="w-full text-center text-sm text-text-muted font-medium hover:text-sky-blue transition-colors"
                  >
                    কেনাকাটা চালিয়ে যান
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Addon Modal */}
      <AnimatePresence>
        {showAddonModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddonModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
            >
              <div className="bg-sky-blue p-6 text-white flex justify-between items-center">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Globe /> ডোমেইন ও হোস্টিং যোগ করতে চান?
                </h3>
                <button onClick={() => setShowAddonModal(null)} className="p-2 hover:bg-white/20 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh]">
                <p className="text-text-muted font-medium">আমাদের কাছ থেকে ডোমেইন ও হোস্টিং নিন এবং ঝামেলামুক্ত সার্ভিস পান।</p>
                
                <AddonSelector onComplete={handleAddons} onSkip={() => setShowAddonModal(null)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Service Modal */}
      <AnimatePresence>
        {showAddServiceModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddServiceModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="bg-sky-blue p-6 text-white flex justify-between items-center">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Plus /> নতুন সার্ভিস যোগ করুন
                </h3>
                <button onClick={() => setShowAddServiceModal(false)} className="p-2 hover:bg-white/20 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted">সার্ভিস নাম</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-border rounded-lg outline-none focus:border-sky-blue"
                      value={newService.name}
                      onChange={(e) => setNewService({...newService, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted">ক্যাটাগরি</label>
                    <select 
                      className="w-full p-2 border border-border rounded-lg outline-none focus:border-sky-blue"
                      value={newService.category}
                      onChange={(e) => setNewService({...newService, category: e.target.value})}
                    >
                      {['ডিজিটাল মার্কেটিং', 'ওয়েবসাইট ডিজাইন', 'গ্রাফিক্স ডিজাইন', 'ভিডিও এডিটিং', 'টেমপ্লেট ও থিম', 'প্রিমিয়াম সাবস্ক্রিপশন', 'প্রিমিয়াম প্লাগিন', 'সাবস্ক্রিপশন প্ল্যান'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted">পুরনো মূল্য (৳)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-border rounded-lg outline-none focus:border-sky-blue"
                      value={newService.originalPrice}
                      onChange={(e) => setNewService({...newService, originalPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted">ডিসকাউন্ট মূল্য (৳)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-border rounded-lg outline-none focus:border-sky-blue"
                      value={newService.discountPrice}
                      onChange={(e) => setNewService({...newService, discountPrice: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted">আইকন (Emoji)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-border rounded-lg outline-none focus:border-sky-blue"
                    value={newService.icon}
                    onChange={(e) => setNewService({...newService, icon: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted">বিবরণ</label>
                  <textarea 
                    rows={3}
                    className="w-full p-2 border border-border rounded-lg outline-none focus:border-sky-blue resize-none"
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                  ></textarea>
                </div>

                <button 
                  onClick={addNewService}
                  className="w-full py-3 bg-sky-blue text-white font-bold rounded-xl shadow-lg hover:bg-sky-blue/90 transition-all"
                >
                  সার্ভিস যোগ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-border py-12 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl font-bold text-sky-blue">Best Solution Experts</h2>
          <p className="text-text-muted max-w-md mx-auto">আমরা আপনার ব্যবসার ডিজিটাল রূপান্তরে সাহায্য করি। লোগো ডিজাইন থেকে শুরু করে ওয়েবসাইট এবং ডিজিটাল মার্কেটিং - সব পাবেন এক জায়গায়।</p>
          <div className="flex justify-center gap-8">
            <a href="#" className="text-text-muted hover:text-sky-blue transition-colors flex items-center gap-2 font-bold"><Phone size={18}/> ০১৮৪৩০৬৭১১৮</a>
            <a href="#" className="text-text-muted hover:text-sky-blue transition-colors flex items-center gap-2 font-bold"><Mail size={18}/> info@bestsolutionexperts.com</a>
          </div>
          <div className="pt-8 border-t border-border">
            <p className="text-xs text-gray-400 font-bold">© ২০২৪ Best Solution Experts. সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AdminRow({ service, onUpdate }: { service: Service, onUpdate: (id: string, op: number, dp: number) => Promise<void>, key?: any }) {
  const [op, setOp] = useState(service.originalPrice);
  const [dp, setDp] = useState(service.discountPrice);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <tr className="border-b border-border hover:bg-gray-50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{service.icon}</span>
          <span className="font-bold">{service.name}</span>
        </div>
      </td>
      <td className="p-4">
        <span className="px-2 py-1 bg-sky-light text-sky-blue text-[10px] font-bold rounded-full uppercase">
          {service.category}
        </span>
      </td>
      <td className="p-4">
        {isEditing ? (
          <input 
            type="number" 
            className="w-24 p-1 border border-border rounded"
            value={op}
            onChange={(e) => setOp(Number(e.target.value))}
          />
        ) : (
          <span className="font-mono">৳{service.originalPrice.toLocaleString('bn-BD')}</span>
        )}
      </td>
      <td className="p-4">
        {isEditing ? (
          <input 
            type="number" 
            className="w-24 p-1 border border-border rounded"
            value={dp}
            onChange={(e) => setDp(Number(e.target.value))}
          />
        ) : (
          <span className="font-mono font-bold text-success">৳{service.discountPrice.toLocaleString('bn-BD')}</span>
        )}
      </td>
      <td className="p-4 text-right">
        {isEditing ? (
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => {
                onUpdate(service.id, op, dp);
                setIsEditing(false);
              }}
              className="p-2 bg-success text-white rounded-lg hover:bg-success/90"
            >
              <Save size={16} />
            </button>
            <button 
              onClick={() => {
                setOp(service.originalPrice);
                setDp(service.discountPrice);
                setIsEditing(false);
              }}
              className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 text-sky-blue hover:bg-sky-light rounded-lg transition-colors"
          >
            <Settings size={16} />
          </button>
        )}
      </td>
    </tr>
  );
}

function AddonSelector({ onComplete, onSkip }: { onComplete: (d: string, h: string, dur: string) => void, onSkip: () => void }) {
  const [selectedDomain, setSelectedDomain] = useState('skip');
  const [selectedHosting, setSelectedHosting] = useState('skip');
  const [hostingDuration, setHostingDuration] = useState('1m');

  return (
    <div className="space-y-8">
      {/* Domain Selection */}
      <section>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-sky-blue">
          <Globe size={20}/> ডোমেইন এক্সটেনশন নির্বাচন:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={() => setSelectedDomain('skip')}
            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedDomain === 'skip' ? 'border-sky-blue bg-sky-light text-sky-blue' : 'border-border hover:border-sky-blue'}`}
          >
            Skip করুন
          </button>
          {DOMAINS.map(d => (
            <button 
              key={d.name}
              onClick={() => setSelectedDomain(d.name)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center ${selectedDomain === d.name ? 'border-sky-blue bg-sky-light text-sky-blue' : 'border-border hover:border-sky-blue'}`}
            >
              <span>{d.name}</span>
              <span className="text-[10px] opacity-70">৳{d.price.toLocaleString('bn-BD')}/বছর</span>
            </button>
          ))}
        </div>
      </section>

      {/* Hosting Selection */}
      <section>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-sky-blue">
          <Layout size={20}/> হোস্টিং প্ল্যান নির্বাচন:
        </h4>
        
        {/* Duration Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
            {[
              { id: '1m', label: '১ মাস' },
              { id: '3m', label: '৩ মাস' },
              { id: '6m', label: '৬ মাস' },
              { id: '1y', label: '১ বছর' }
            ].map(dur => (
              <button
                key={dur.id}
                onClick={() => setHostingDuration(dur.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${hostingDuration === dur.id ? 'bg-white text-sky-blue shadow-sm' : 'text-text-muted hover:text-sky-blue'}`}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => setSelectedHosting('skip')}
            className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center justify-center gap-2 ${selectedHosting === 'skip' ? 'border-sky-blue bg-sky-light text-sky-blue' : 'border-border hover:border-sky-blue'}`}
          >
            <X size={24} />
            Skip করুন
          </button>
          {HOSTING_PLANS.map(h => {
            const price = h.prices[hostingDuration as keyof typeof h.prices];
            return (
              <button 
                key={h.name}
                onClick={() => setSelectedHosting(h.name)}
                className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center text-center gap-2 ${selectedHosting === h.name ? 'border-sky-blue bg-sky-light text-sky-blue' : 'border-border hover:border-sky-blue'}`}
              >
                <span className="text-2xl">☁️</span>
                <span>{h.name}</span>
                <span className="text-lg text-success">৳{price.toLocaleString('bn-BD')}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex gap-4 pt-4">
        <button 
          onClick={onSkip}
          className="flex-grow py-3 border-2 border-border text-text-muted font-bold rounded-xl hover:bg-gray-50 transition-all"
        >
          Skip করুন
        </button>
        <button 
          onClick={() => onComplete(selectedDomain, selectedHosting, hostingDuration)}
          className="flex-grow py-3 bg-orange-brand text-white font-bold rounded-xl shadow-lg hover:bg-orange-brand/90 transition-all"
        >
          যোগ করুন
        </button>
      </div>
    </div>
  );
}
