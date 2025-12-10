/**
 * CustomerServiceAgent - Elegant AI Chat Widget
 * Premium design with smooth animations and modern UI
 * Demo-Ready Version with all polish features
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, Sparkles, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

interface ChatProduct {
  id: string;
  name: string;
  short_name: string;
  price: number;
  sale_price?: number;
  category: string;
  image: string;
  reason?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
  clarificationQuestions?: string[];
}


export default function CustomerServiceAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'مرحباً! أنا Elegance AI Stylist ✨\nازاي أقدر أساعدك النهاردة?\n\nHello! I\'m your Elegance AI Stylist ✨\nHow can I help you today?'
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset/Restart chat session
  const handleRestart = () => {
    setMessages([{
      role: 'assistant',
      content: 'مرحباً! أنا Elegance AI Stylist ✨\nازاي أقدر أساعدك النهاردة?\n\nHello! I\'m your Elegance AI Stylist ✨\nHow can I help you today?'
    }]);
    setInput('');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const response = await apiService.chat({
        message: userMessage,
        history: history.slice(-6)
      });

      let assistantContent = response.message;
      const clarificationQuestions = response.needs_clarification
        ? response.clarification_questions
        : undefined;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantContent,
        products: response.products.length > 0 ? response.products : undefined,
        clarificationQuestions: clarificationQuestions,
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'عذراً، حصل خطأ. حاول تاني.\nSorry, an error occurred. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Product Carousel Component
  const ProductCarousel = ({ products }: { products: ChatProduct[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const scroll = (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        const scrollAmount = 150;
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
        setTimeout(checkScroll, 300);
      }
    };

    return (
      <div style={{ position: 'relative', marginTop: '12px' }}>
        <p style={{
          fontSize: '12px',
          color: '#666',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Sparkles size={12} /> {products.length} منتجات مقترحة
        </p>

        {/* Scroll buttons */}
        {products.length > 2 && (
          <>
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <ChevronRight size={16} />
              </button>
            )}
          </>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    );
  };

  // Mini product card for chat
  const ProductCard = ({ product }: { product: ChatProduct }) => {
    const displayName = product.short_name || product.name.slice(0, 30);

    return (
      <Link
        to={`/product/${product.id}`}
        onClick={() => setIsOpen(false)}
        title={product.reason || product.name}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '120px',
          minWidth: '120px',
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'all 0.25s ease',
          border: '1px solid #f0f0f0',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
          e.currentTarget.style.borderColor = '#D4AF37';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
          e.currentTarget.style.borderColor = '#f0f0f0';
        }}
      >
        <div style={{ height: '85px', backgroundColor: '#f8f8f8', position: 'relative' }}>
          <img
            src={product.image || '/placeholder.jpg'}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = '/placeholder.jpg';
            }}
          />
          {product.sale_price && product.sale_price < product.price && (
            <span style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '8px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px',
            }}>
              SALE
            </span>
          )}
        </div>
        <div style={{ padding: '10px' }}>
          <p style={{
            fontSize: '11px',
            margin: 0,
            lineHeight: '1.3',
            height: '26px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            color: '#333',
            fontWeight: 500,
          }}>
            {displayName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: product.sale_price ? '#ef4444' : '#1a1a1a',
              margin: 0
            }}>
              ${(product.sale_price || product.price).toFixed(2)}
            </p>
            {product.sale_price && product.sale_price < product.price && (
              <p style={{
                fontSize: '10px',
                color: '#999',
                textDecoration: 'line-through',
                margin: 0
              }}>
                ${product.price.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  };

  // Typing Indicator Component
  const TypingIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        padding: '14px 20px',
        borderRadius: '18px 18px 18px 4px',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span className="typing-dot" style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#D4AF37',
            animation: 'typingBounce 1.4s ease-in-out infinite',
            animationDelay: '0s'
          }} />
          <span className="typing-dot" style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#D4AF37',
            animation: 'typingBounce 1.4s ease-in-out infinite',
            animationDelay: '0.2s'
          }} />
          <span className="typing-dot" style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#D4AF37',
            animation: 'typingBounce 1.4s ease-in-out infinite',
            animationDelay: '0.4s'
          }} />
        </div>
        <span style={{ fontSize: '13px', color: '#888', marginLeft: '6px' }}>جاري التفكير...</span>
      </div>
    </div>
  );


  return createPortal(
    <>
      {/* Floating Chat Button with Pulse Animation */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(90deg) scale(1)' : 'rotate(0deg) scale(1)',
          animation: isOpen ? 'none' : 'pulse 2s ease-in-out infinite',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = isOpen ? 'rotate(90deg) scale(1.1)' : 'scale(1.15)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'rotate(90deg) scale(1)' : 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.35)';
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={28} /> : (
          <div style={{ position: 'relative' }}>
            <MessageCircle size={28} />
            <Sparkles
              size={14}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                color: '#D4AF37',
                animation: 'sparkle 1.5s ease-in-out infinite'
              }}
            />
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '390px',
            maxWidth: 'calc(100vw - 48px)',
            height: '560px',
            maxHeight: 'calc(100vh - 150px)',
            backgroundColor: '#fafafa',
            borderRadius: '20px',
            boxShadow: '0 12px 60px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 99998,
            overflow: 'hidden',
            animation: 'slideUp 0.35s ease',
          }}
        >
          {/* Header with Restart Button */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37 0%, #f5d76e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(212,175,55,0.3)',
            }}>
              <Sparkles size={24} color="#1a1a1a" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, letterSpacing: '0.3px' }}>
                Elegance AI Stylist
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', opacity: 0.85 }}>
                مساعدك الشخصي للأزياء ✨
              </p>
            </div>

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              title="محادثة جديدة / New Chat"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,55,0.3)';
                e.currentTarget.style.transform = 'rotate(180deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'rotate(0deg)';
              }}
            >
              <RotateCcw size={18} />
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {messages.map((message, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ maxWidth: '88%' }}>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: message.role === 'user'
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                      backgroundColor: message.role === 'user' ? '#1a1a1a' : 'white',
                      color: message.role === 'user' ? 'white' : '#333',
                      boxShadow: message.role === 'user'
                        ? '0 2px 8px rgba(0,0,0,0.15)'
                        : '0 2px 8px rgba(0,0,0,0.06)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {message.content}
                  </div>

                  {/* Product Carousel */}
                  {message.products && message.products.length > 0 && (
                    <ProductCarousel products={message.products} />
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderTop: '1px solid #eee',
          }}>
            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك... / Type your message..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: '25px',
                  border: '2px solid #e8e8e8',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.25s ease',
                  backgroundColor: '#fafafa',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#D4AF37';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.15)';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.backgroundColor = '#fafafa';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, #D4AF37 0%, #c4a030 100%)'
                    : '#e0e0e0',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s ease',
                  boxShadow: input.trim() && !isLoading
                    ? '0 4px 15px rgba(212,175,55,0.4)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isLoading) {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(212,175,55,0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  if (input.trim() && !isLoading) {
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(212,175,55,0.4)';
                  }
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 0 rgba(212,175,55,0.4);
          }
          50% {
            box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 12px rgba(212,175,55,0);
          }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        
        /* Hide scrollbar for product carousel */
        div::-webkit-scrollbar {
          height: 0;
          width: 0;
        }
      `}</style>
    </>,
    document.body
  );
}
