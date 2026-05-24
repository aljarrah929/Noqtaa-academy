import { useState, useEffect } from 'react';

export interface CartItem {
  id: number;
  title: string;
  price: number;
}

export function useCart() {
  // قراءة السلة من المتصفح عند التحميل
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('noqtaa_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // حفظ السلة وتحديث كل الشاشات
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('noqtaa_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cart_updated')); // عشان الـ Header يحس بالتغيير فوراً
  };

  const addToCart = (course: CartItem) => {
    if (!cart.find(item => item.id === course.id)) {
      saveCart([...cart, course]);
    }
  };

  const removeFromCart = (courseId: number) => {
    saveCart(cart.filter(item => item.id !== courseId));
  };

  const clearCart = () => {
    saveCart([]);
  };

  const isInCart = (courseId: number) => {
    return cart.some(item => item.id === courseId);
  };

  // استشعار التغييرات لو الطالب فتح أكثر من تاب
  useEffect(() => {
    const handleStorageChange = () => {
       try {
         const saved = localStorage.getItem('noqtaa_cart');
         setCart(saved ? JSON.parse(saved) : []);
       } catch {}
    };
    window.addEventListener('cart_updated', handleStorageChange);
    return () => window.removeEventListener('cart_updated', handleStorageChange);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  return { cart, addToCart, removeFromCart, clearCart, isInCart, cartTotal };
}