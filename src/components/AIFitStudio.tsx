/**
 * AIFitStudio - Multi-step AI-powered Fit & Style Assistant
 * Premium modal UI with personalized outfit recommendations
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Sparkles, Loader2, Check, User, Palette, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

// ============ Types ============

interface FitFormData {
    // Step 1 - About You
    gender: string;
    height_cm: number | null;
    weight_kg: number | null;
    body_shape: string;
    usual_size: string;
    fit_pain_points: string[];

    // Step 2 - Style & Occasion
    fit_preference: string;
    style_aesthetic: string;
    main_occasion: string;
    budget_min: number | null;
    budget_max: number | null;
    favorite_colors: string[];
    avoid_colors: string[];
}

interface RecommendedProduct {
    id: string;
    name: string;
    short_name: string;
    price: number;
    sale_price?: number;
    category: string;
    image: string;
    reason: string;
}

interface FitResponse {
    summary: string;
    fit_tips: string[];
    products: RecommendedProduct[];
}

// ============ Constants ============

const BODY_SHAPES = ['Rectangle', 'Pear', 'Hourglass', 'Apple', 'Inverted Triangle'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const FIT_PAIN_POINTS = [
    'Shoulders too tight',
    'Waist too tight',
    'Pants too long',
    'Sleeves too long',
    'Bust area too tight',
    'Hips too tight',
    'Overall too baggy',
    'Overall too tight'
];
const FIT_PREFERENCES = ['Slim', 'Regular', 'Oversized', 'Relaxed'];
const STYLE_AESTHETICS = ['Minimal & Clean', 'Elegant & Chic', 'Streetwear', 'Sporty', 'Modest'];
const OCCASIONS = ['Work', 'Casual', 'Party', 'Interview', 'Wedding', 'Date'];
const COLORS = ['Black', 'White', 'Navy', 'Red', 'Pink', 'Blue', 'Green', 'Brown', 'Beige', 'Grey', 'Gold', 'Silver'];

// ============ Smooth Slider Component ============
// Uses local state for smooth dragging, only syncs on release

interface SmoothSliderProps {
    label: string;
    unit: string;
    min: number;
    max: number;
    defaultValue: number;
    value: number | null;
    onChange: (value: number) => void;
}

function SmoothSlider({ label, unit, min, max, defaultValue, value, onChange }: SmoothSliderProps) {
    const [localValue, setLocalValue] = React.useState(value || defaultValue);
    const [isDragging, setIsDragging] = React.useState(false);

    // Sync local value when parent value changes (but not while dragging)
    React.useEffect(() => {
        if (!isDragging && value !== null) {
            setLocalValue(value);
        }
    }, [value, isDragging]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        setLocalValue(newValue);
    };

    const handleRelease = () => {
        setIsDragging(false);
        onChange(localValue);
    };

    return (
        <div>
            <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                {label}: {localValue} {unit}
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step="1"
                value={localValue}
                onChange={handleChange}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={handleRelease}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={handleRelease}
                style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#1a1a1a',
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginTop: '4px' }}>
                <span>{min}{unit === '$' ? '' : ''}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}

// ============ Component ============

interface AIFitStudioProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AIFitStudio({ isOpen, onClose }: AIFitStudioProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<FitResponse | null>(null);

    const [formData, setFormData] = useState<FitFormData>({
        gender: '',
        height_cm: null,
        weight_kg: null,
        body_shape: '',
        usual_size: '',
        fit_pain_points: [],
        fit_preference: '',
        style_aesthetic: '',
        main_occasion: '',
        budget_min: null,
        budget_max: null,
        favorite_colors: [],
        avoid_colors: [],
    });

    const handleInputChange = (field: keyof FitFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (field: 'fit_pain_points' | 'favorite_colors' | 'avoid_colors', item: string) => {
        setFormData(prev => {
            const arr = prev[field];
            if (arr.includes(item)) {
                return { ...prev, [field]: arr.filter(i => i !== item) };
            } else {
                return { ...prev, [field]: [...arr, item] };
            }
        });
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.getFitRecommendations(formData);
            setResponse(result);
            setCurrentStep(4); // Results step
        } catch (error) {
            console.error('Fit Assistant error:', error);
            setResponse({
                summary: 'Something went wrong. Please try again.',
                fit_tips: ['Try refreshing the page'],
                products: []
            });
            setCurrentStep(4);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartOver = () => {
        setCurrentStep(1);
        setResponse(null);
        setFormData({
            gender: '',
            height_cm: null,
            weight_kg: null,
            body_shape: '',
            usual_size: '',
            fit_pain_points: [],
            fit_preference: '',
            style_aesthetic: '',
            main_occasion: '',
            budget_min: null,
            budget_max: null,
            favorite_colors: [],
            avoid_colors: [],
        });
    };

    if (!isOpen) return null;

    // ============ Step Components ============

    const StepIndicator = () => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {[1, 2, 3].map(step => (
                <div
                    key={step}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: currentStep >= step ? '#1a1a1a' : '#e5e5e5',
                        color: currentStep >= step ? 'white' : '#666',
                        transition: 'all 0.3s ease',
                    }}
                >
                    {currentStep > step ? <Check size={16} /> : step}
                </div>
            ))}
        </div>
    );

    const Step1AboutYou = () => (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <User size={32} style={{ color: '#1a1a1a', marginBottom: '8px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>About You</h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Help us understand your body and preferences</p>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
                {/* Gender */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Gender</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Women', 'Men', 'Other'].map(g => (
                            <button
                                key={g}
                                onClick={() => handleInputChange('gender', g)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: formData.gender === g ? '2px solid #1a1a1a' : '1px solid #ddd',
                                    borderRadius: '8px',
                                    backgroundColor: formData.gender === g ? '#f5f5f5' : 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: formData.gender === g ? '600' : '400',
                                }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Height & Weight - Smooth Range Sliders */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <SmoothSlider
                        label="Height"
                        unit="cm"
                        min={140}
                        max={220}
                        defaultValue={170}
                        value={formData.height_cm}
                        onChange={(val) => handleInputChange('height_cm', val)}
                    />
                    <SmoothSlider
                        label="Weight"
                        unit="kg"
                        min={40}
                        max={150}
                        defaultValue={65}
                        value={formData.weight_kg}
                        onChange={(val) => handleInputChange('weight_kg', val)}
                    />
                </div>

                {/* Body Shape */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Body Shape</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {BODY_SHAPES.map(shape => (
                            <button
                                key={shape}
                                onClick={() => handleInputChange('body_shape', shape)}
                                style={{
                                    padding: '8px 14px',
                                    border: formData.body_shape === shape ? '2px solid #1a1a1a' : '1px solid #ddd',
                                    borderRadius: '20px',
                                    backgroundColor: formData.body_shape === shape ? '#f5f5f5' : 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: formData.body_shape === shape ? '600' : '400',
                                }}
                            >
                                {shape}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Usual Size */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Usual Size</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {SIZES.map(size => (
                            <button
                                key={size}
                                onClick={() => handleInputChange('usual_size', size)}
                                style={{
                                    flex: 1,
                                    padding: '10px 6px',
                                    border: formData.usual_size === size ? '2px solid #1a1a1a' : '1px solid #ddd',
                                    borderRadius: '8px',
                                    backgroundColor: formData.usual_size === size ? '#f5f5f5' : 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: formData.usual_size === size ? '600' : '400',
                                }}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fit Pain Points */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                        Fit Issues (select all that apply)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {FIT_PAIN_POINTS.map(point => (
                            <button
                                key={point}
                                onClick={() => toggleArrayItem('fit_pain_points', point)}
                                style={{
                                    padding: '6px 12px',
                                    border: formData.fit_pain_points.includes(point) ? '2px solid #ef4444' : '1px solid #ddd',
                                    borderRadius: '16px',
                                    backgroundColor: formData.fit_pain_points.includes(point) ? '#fef2f2' : 'white',
                                    color: formData.fit_pain_points.includes(point) ? '#dc2626' : '#333',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                {point}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const Step2StyleOccasion = () => (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Palette size={32} style={{ color: '#1a1a1a', marginBottom: '8px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>Style & Occasion</h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Tell us about your style preferences</p>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
                {/* Fit Preference */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Fit Preference</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {FIT_PREFERENCES.map(fit => (
                            <button
                                key={fit}
                                onClick={() => handleInputChange('fit_preference', fit)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: formData.fit_preference === fit ? '2px solid #1a1a1a' : '1px solid #ddd',
                                    borderRadius: '8px',
                                    backgroundColor: formData.fit_preference === fit ? '#f5f5f5' : 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: formData.fit_preference === fit ? '600' : '400',
                                }}
                            >
                                {fit}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Style Aesthetic */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Style Aesthetic</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {STYLE_AESTHETICS.map(style => (
                            <button
                                key={style}
                                onClick={() => handleInputChange('style_aesthetic', style)}
                                style={{
                                    padding: '8px 14px',
                                    border: formData.style_aesthetic === style ? '2px solid #1a1a1a' : '1px solid #ddd',
                                    borderRadius: '20px',
                                    backgroundColor: formData.style_aesthetic === style ? '#f5f5f5' : 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: formData.style_aesthetic === style ? '600' : '400',
                                }}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Occasion */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Main Occasion</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {OCCASIONS.map(occ => (
                            <button
                                key={occ}
                                onClick={() => handleInputChange('main_occasion', occ)}
                                style={{
                                    padding: '8px 16px',
                                    border: formData.main_occasion === occ ? '2px solid #1a1a1a' : '1px solid #ddd',
                                    borderRadius: '20px',
                                    backgroundColor: formData.main_occasion === occ ? '#f5f5f5' : 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: formData.main_occasion === occ ? '600' : '400',
                                }}
                            >
                                {occ}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Budget - Optional with Toggle */}
                <div>
                    <label
                        style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={formData.budget_min !== null || formData.budget_max !== null}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    handleInputChange('budget_min', 0);
                                    handleInputChange('budget_max', 500);
                                } else {
                                    handleInputChange('budget_min', null);
                                    handleInputChange('budget_max', null);
                                }
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#1a1a1a' }}
                        />
                        Set Budget Limit (Optional)
                    </label>

                    {(formData.budget_min !== null || formData.budget_max !== null) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                            <SmoothSlider
                                label="Min Budget"
                                unit="$"
                                min={0}
                                max={500}
                                defaultValue={0}
                                value={formData.budget_min}
                                onChange={(val) => handleInputChange('budget_min', val)}
                            />
                            <SmoothSlider
                                label="Max Budget"
                                unit="$"
                                min={10}
                                max={1000}
                                defaultValue={500}
                                value={formData.budget_max}
                                onChange={(val) => handleInputChange('budget_max', val)}
                            />
                        </div>
                    )}
                </div>

                {/* Favorite Colors */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                        Favorite Colors
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => toggleArrayItem('favorite_colors', color)}
                                style={{
                                    padding: '6px 12px',
                                    border: formData.favorite_colors.includes(color) ? '2px solid #22c55e' : '1px solid #ddd',
                                    borderRadius: '16px',
                                    backgroundColor: formData.favorite_colors.includes(color) ? '#f0fdf4' : 'white',
                                    color: formData.favorite_colors.includes(color) ? '#16a34a' : '#333',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                {color}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Avoid Colors */}
                <div>
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                        Colors to Avoid
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => toggleArrayItem('avoid_colors', color)}
                                style={{
                                    padding: '6px 12px',
                                    border: formData.avoid_colors.includes(color) ? '2px solid #ef4444' : '1px solid #ddd',
                                    borderRadius: '16px',
                                    backgroundColor: formData.avoid_colors.includes(color) ? '#fef2f2' : 'white',
                                    color: formData.avoid_colors.includes(color) ? '#dc2626' : '#333',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                {color}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const Step3Review = () => (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Gift size={32} style={{ color: '#1a1a1a', marginBottom: '8px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>Review & Get Recommendations</h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Confirm your preferences and get personalized picks</p>
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', color: '#374151' }}>Your Profile Summary</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    {formData.gender && <div><strong>Gender:</strong> {formData.gender}</div>}
                    {formData.body_shape && <div><strong>Body Shape:</strong> {formData.body_shape}</div>}
                    {formData.usual_size && <div><strong>Size:</strong> {formData.usual_size}</div>}
                    {formData.fit_preference && <div><strong>Fit:</strong> {formData.fit_preference}</div>}
                    {formData.style_aesthetic && <div><strong>Style:</strong> {formData.style_aesthetic}</div>}
                    {formData.main_occasion && <div><strong>Occasion:</strong> {formData.main_occasion}</div>}
                    {(formData.budget_min || formData.budget_max) && (
                        <div><strong>Budget:</strong> ${formData.budget_min || 0} - ${formData.budget_max || '∞'}</div>
                    )}
                </div>

                {formData.fit_pain_points.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '13px' }}>
                        <strong>Fit Issues:</strong> {formData.fit_pain_points.join(', ')}
                    </div>
                )}

                {formData.favorite_colors.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '13px' }}>
                        <strong>Favorite Colors:</strong> {formData.favorite_colors.join(', ')}
                    </div>
                )}
            </div>

            <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1,
                }}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        Analyzing your profile...
                    </>
                ) : (
                    <>
                        <Sparkles size={20} />
                        Get AI Recommendations
                    </>
                )}
            </button>
        </div>
    );

    const Step4Results = () => (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Sparkles size={32} style={{ color: '#22c55e', marginBottom: '8px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>Your Personalized Recommendations</h3>
            </div>

            {response && (
                <>
                    {/* Summary */}
                    <div style={{
                        backgroundColor: '#f0fdf4',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        borderLeft: '4px solid #22c55e',
                    }}>
                        <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.6' }}>{response.summary}</p>
                    </div>

                    {/* Fit Tips */}
                    {response.fit_tips.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 10px 0' }}>💡 Style Tips for You</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
                                {response.fit_tips.map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Products */}
                    {response.products.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 12px 0' }}>🛍️ Recommended Products</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {response.products.map(product => (
                                    <Link
                                        key={product.id}
                                        to={`/product/${product.id}`}
                                        onClick={onClose}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <img
                                            src={product.image || '/placeholder.jpg'}
                                            alt={product.short_name}
                                            style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                                            onError={(e: any) => { e.target.src = '/placeholder.jpg'; }}
                                        />
                                        <div style={{ padding: '10px' }}>
                                            <p style={{ fontSize: '12px', margin: '0 0 4px 0', fontWeight: '500', lineHeight: '1.3' }}>
                                                {product.short_name}
                                            </p>
                                            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#1a1a1a' }}>
                                                ${(product.sale_price || product.price).toFixed(2)}
                                            </p>
                                            <p style={{ fontSize: '11px', color: '#666', margin: 0, lineHeight: '1.4', fontStyle: 'italic' }}>
                                                {product.reason}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Start Over Button */}
                    <button
                        onClick={handleStartOver}
                        style={{
                            width: '100%',
                            marginTop: '20px',
                            padding: '12px',
                            backgroundColor: 'white',
                            color: '#1a1a1a',
                            border: '2px solid #1a1a1a',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        Start Over
                    </button>
                </>
            )}
        </div>
    );

    // ============ Main Render ============

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={22} style={{ color: '#1a1a1a' }} />
                        <span style={{ fontSize: '18px', fontWeight: '700' }}>AI Fit Studio</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                        }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {currentStep <= 3 && <StepIndicator />}

                    {currentStep === 1 && <Step1AboutYou />}
                    {currentStep === 2 && <Step2StyleOccasion />}
                    {currentStep === 3 && <Step3Review />}
                    {currentStep === 4 && <Step4Results />}
                </div>

                {/* Footer Navigation */}
                {currentStep <= 3 && currentStep !== 4 && (
                    <div style={{
                        padding: '16px 20px',
                        borderTop: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}>
                        <button
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            disabled={currentStep === 1}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: currentStep === 1 ? '#f5f5f5' : 'white',
                                color: currentStep === 1 ? '#999' : '#1a1a1a',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <ChevronLeft size={18} />
                            Back
                        </button>

                        {currentStep < 3 && (
                            <button
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#1a1a1a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                Next
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>,
        document.body
    );
}
