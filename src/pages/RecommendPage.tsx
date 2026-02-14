import { useState } from 'react'
import { usePartnerData } from '@/hooks/usePartnerData'
import { usePadPreferences, usePartnerPadPreferences, buildShoppingUrls } from '@/hooks/usePadPreferences'
import { useToast } from '@/contexts/ToastContext'
import {
  PRODUCT_TYPE_LABELS, PRODUCT_TYPE_ICONS,
  PAD_SIZE_LABELS, SKIN_SENSITIVITY_LABELS, COMFORT_PRIORITY_LABELS,
  BRAND_OPTIONS, PARTNER_CARE_TIPS,
} from '@/types'
import type { ProductType, PadSize, SkinSensitivity, ComfortPriority } from '@/types'
import './RecommendPage.css'

// Owner: Survey + Recommendations
function OwnerView() {
  const { preferences, isLoading, savePreferences, hasSurvey } = usePadPreferences()
  const { showToast } = useToast()
  const [showSurvey, setShowSurvey] = useState(false)

  if (isLoading) {
    return <div className="recommend-loading">로딩 중...</div>
  }

  if (hasSurvey && !showSurvey) {
    return <RecommendationResults preferences={preferences!} onRetake={() => setShowSurvey(true)} />
  }

  return (
    <SurveyForm
      initial={preferences}
      onSave={async (data) => {
        try {
          await savePreferences.mutateAsync(data)
          showToast('선호도가 저장되었어요!', 'success')
          setShowSurvey(false)
        } catch {
          showToast('저장에 실패했어요. 다시 시도해주세요.', 'error')
        }
      }}
      saving={savePreferences.isPending}
    />
  )
}

// Survey Form
function SurveyForm({
  initial,
  onSave,
  saving,
}: {
  initial: import('@/types').PadPreferences | null | undefined
  onSave: (data: {
    product_types: ProductType[]
    brand: string | null
    product_name: string | null
    sizes: PadSize[]
    skin_sensitivity: SkinSensitivity
    priority: ComfortPriority
  }) => Promise<void>
  saving: boolean
}) {
  const [productTypes, setProductTypes] = useState<ProductType[]>(initial?.product_types ?? [])
  const [brand, setBrand] = useState<string | null>(initial?.brand ?? null)
  const [customBrand, setCustomBrand] = useState('')
  const [isCustomBrand, setIsCustomBrand] = useState(
    initial?.brand ? !BRAND_OPTIONS.includes(initial.brand as typeof BRAND_OPTIONS[number]) : false
  )
  const [productName, setProductName] = useState(initial?.product_name ?? '')
  const [sizes, setSizes] = useState<PadSize[]>(initial?.sizes ?? [])
  const [skinSensitivity, setSkinSensitivity] = useState<SkinSensitivity>(initial?.skin_sensitivity ?? 'normal')
  const [priority, setPriority] = useState<ComfortPriority>(initial?.priority ?? 'comfort')

  const toggleProductType = (type: ProductType) => {
    setProductTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleSize = (size: PadSize) => {
    setSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  const selectBrand = (b: string) => {
    setIsCustomBrand(false)
    setBrand(prev => prev === b ? null : b)
  }

  const handleCustomBrand = () => {
    setIsCustomBrand(true)
    setBrand(null)
  }

  const handleSubmit = async () => {
    const finalBrand = isCustomBrand ? (customBrand.trim() || null) : brand
    await onSave({
      product_types: productTypes,
      brand: finalBrand,
      product_name: productName.trim() || null,
      sizes,
      skin_sensitivity: skinSensitivity,
      priority,
    })
  }

  const canSubmit = productTypes.length > 0

  return (
    <div className="recommend-survey">
      <div className="recommend-header">
        <span className="recommend-header-icon">🎁</span>
        <h2>제품 추천 설문</h2>
        <p>선호도를 알려주시면 맞춤 추천을 해드릴게요</p>
      </div>

      {/* Step 1: Product Type */}
      <div className="survey-section">
        <h3 className="survey-section-title">
          <span className="survey-step-num">1</span>
          주로 어떤 제품을 사용하세요?
        </h3>
        <div className="survey-toggle-grid">
          {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map(type => (
            <button
              key={type}
              type="button"
              className={`survey-toggle-btn ${productTypes.includes(type) ? 'survey-toggle-btn--active' : ''}`}
              onClick={() => toggleProductType(type)}
            >
              <span className="survey-toggle-icon">{PRODUCT_TYPE_ICONS[type]}</span>
              <span className="survey-toggle-label">{PRODUCT_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Brand & Product */}
      <div className="survey-section">
        <h3 className="survey-section-title">
          <span className="survey-step-num">2</span>
          주로 사용하던 브랜드와 상품은?
        </h3>
        <div className="survey-brand-grid">
          {BRAND_OPTIONS.map(b => (
            <button
              key={b}
              type="button"
              className={`survey-brand-btn ${!isCustomBrand && brand === b ? 'survey-brand-btn--active' : ''}`}
              onClick={() => selectBrand(b)}
            >
              {b}
            </button>
          ))}
          <button
            type="button"
            className={`survey-brand-btn ${isCustomBrand ? 'survey-brand-btn--active' : ''}`}
            onClick={handleCustomBrand}
          >
            기타
          </button>
        </div>
        {isCustomBrand && (
          <input
            type="text"
            className="survey-text-input"
            placeholder="브랜드명을 입력해주세요"
            value={customBrand}
            onChange={e => setCustomBrand(e.target.value)}
          />
        )}
        <input
          type="text"
          className="survey-text-input"
          placeholder="예: 오버나이트 슬림, 순면 중형 (선택사항)"
          value={productName}
          onChange={e => setProductName(e.target.value)}
        />
      </div>

      {/* Step 3: Size */}
      <div className="survey-section">
        <h3 className="survey-section-title">
          <span className="survey-step-num">3</span>
          어떤 사이즈를 주로 사용하세요?
        </h3>
        <div className="survey-toggle-grid survey-toggle-grid--2col">
          {(Object.keys(PAD_SIZE_LABELS) as PadSize[]).map(size => (
            <button
              key={size}
              type="button"
              className={`survey-toggle-btn ${sizes.includes(size) ? 'survey-toggle-btn--active' : ''}`}
              onClick={() => toggleSize(size)}
            >
              <span className="survey-toggle-label">{PAD_SIZE_LABELS[size]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 4: Skin & Priority */}
      <div className="survey-section">
        <h3 className="survey-section-title">
          <span className="survey-step-num">4</span>
          피부 민감도는 어떤 편이에요?
        </h3>
        <div className="survey-toggle-grid survey-toggle-grid--3col">
          {(Object.keys(SKIN_SENSITIVITY_LABELS) as SkinSensitivity[]).map(s => (
            <button
              key={s}
              type="button"
              className={`survey-toggle-btn ${skinSensitivity === s ? 'survey-toggle-btn--active' : ''}`}
              onClick={() => setSkinSensitivity(s)}
            >
              <span className="survey-toggle-label">{SKIN_SENSITIVITY_LABELS[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="survey-section">
        <h3 className="survey-section-title">
          <span className="survey-step-num">5</span>
          가장 중요하게 생각하는 건?
        </h3>
        <div className="survey-toggle-grid survey-toggle-grid--3col">
          {(Object.keys(COMFORT_PRIORITY_LABELS) as ComfortPriority[]).map(p => (
            <button
              key={p}
              type="button"
              className={`survey-toggle-btn ${priority === p ? 'survey-toggle-btn--active' : ''}`}
              onClick={() => setPriority(p)}
            >
              <span className="survey-toggle-label">{COMFORT_PRIORITY_LABELS[p]}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn-primary recommend-submit"
        disabled={!canSubmit || saving}
        onClick={handleSubmit}
      >
        {saving ? '저장 중...' : '추천 받기'}
      </button>
    </div>
  )
}

// Recommendation Results
function RecommendationResults({
  preferences,
  onRetake,
}: {
  preferences: import('@/types').PadPreferences
  onRetake: () => void
}) {
  const shoppingUrls = buildShoppingUrls(preferences)

  const getTipMessage = (): string | null => {
    if (preferences.skin_sensitivity === 'sensitive') {
      return '피부가 민감하시면 라엘이나 나트라케어 순면 제품도 추천해요!'
    }
    if (preferences.priority === 'eco') {
      return '친환경을 중시하시면 유기농 순면 제품을 확인해보세요!'
    }
    if (preferences.priority === 'cotton') {
      return '순면 제품은 피부 자극이 적어 민감한 피부에 좋아요!'
    }
    if (preferences.priority === 'price') {
      return '대용량 묶음 상품을 검색하면 더 저렴하게 구매할 수 있어요!'
    }
    return null
  }

  return (
    <div className="recommend-results">
      <div className="recommend-header">
        <span className="recommend-header-icon">🎁</span>
        <h2>맞춤 추천</h2>
      </div>

      {/* Summary Card */}
      <div className="recommend-summary">
        <h3 className="recommend-summary-title">내 선호도</h3>
        <div className="recommend-summary-tags">
          {preferences.product_types.map(type => (
            <span key={type} className="recommend-tag">
              {PRODUCT_TYPE_ICONS[type]} {PRODUCT_TYPE_LABELS[type]}
            </span>
          ))}
          {preferences.brand && (
            <span className="recommend-tag">{preferences.brand}</span>
          )}
          {preferences.product_name && (
            <span className="recommend-tag">{preferences.product_name}</span>
          )}
          {preferences.sizes.map(size => (
            <span key={size} className="recommend-tag">{PAD_SIZE_LABELS[size]}</span>
          ))}
          <span className="recommend-tag">{SKIN_SENSITIVITY_LABELS[preferences.skin_sensitivity]}</span>
          <span className="recommend-tag">{COMFORT_PRIORITY_LABELS[preferences.priority]}</span>
        </div>
      </div>

      {/* Product Cards */}
      {shoppingUrls.map((urls, idx) => {
        const productType = preferences.product_types[idx] ?? preferences.product_types[0]
        return (
          <div key={idx} className="recommend-product-card">
            <div className="recommend-product-header">
              <span className="recommend-product-icon">{PRODUCT_TYPE_ICONS[productType]}</span>
              <span className="recommend-product-name">{PRODUCT_TYPE_LABELS[productType]}</span>
              {preferences.brand && (
                <span className="recommend-product-brand">{preferences.brand}</span>
              )}
            </div>
            <p className="recommend-product-desc">이거 써보는 건 어때요?</p>
            <div className="recommend-shop-links">
              <a
                href={urls.naver}
                target="_blank"
                rel="noopener noreferrer"
                className="recommend-shop-btn recommend-shop-btn--naver"
              >
                네이버쇼핑에서 보기
              </a>
              <a
                href={urls.coupang}
                target="_blank"
                rel="noopener noreferrer"
                className="recommend-shop-btn recommend-shop-btn--coupang"
              >
                쿠팡에서 보기
              </a>
            </div>
          </div>
        )
      })}

      {/* Tip */}
      {getTipMessage() && (
        <div className="recommend-tip">
          <span className="recommend-tip-icon">💡</span>
          <p>{getTipMessage()}</p>
        </div>
      )}

      {/* Retake Button */}
      <button
        type="button"
        className="recommend-retake-btn"
        onClick={onRetake}
      >
        설문 다시하기
      </button>
    </div>
  )
}

// Partner: Care Tips + Gift Recommendations
function PartnerView() {
  const { partnerName, partnerData } = usePartnerData()
  const ownerId = partnerData?.ownerSettings?.user_id ?? null
  const { preferences: ownerPrefs, isLoading: prefsLoading, hasSurvey: ownerHasSurvey } = usePartnerPadPreferences(ownerId)
  const phaseInfo = partnerData?.phaseInfo ?? null
  const phase = phaseInfo?.phase ?? 'follicular'
  const careTips = PARTNER_CARE_TIPS[phase]

  return (
    <div className="recommend-partner">
      {/* Header */}
      <div className="recommend-header">
        <span className="recommend-header-icon">💑</span>
        <h2>{partnerName ?? '파트너'}님을 위한 가이드</h2>
      </div>

      {/* Care Tips */}
      <div className="recommend-care-section">
        <div className="recommend-care-header">
          <h3>지금 시기 행동요령</h3>
          {phaseInfo && (
            <span
              className="recommend-phase-badge"
              style={{ backgroundColor: phaseInfo.color }}
            >
              {phaseInfo.phaseKo}
            </span>
          )}
        </div>
        <div className="recommend-care-list">
          {careTips.map((tip, idx) => (
            <div key={idx} className="recommend-care-card">
              <span className="recommend-care-emoji">{tip.emoji}</span>
              <div className="recommend-care-content">
                <strong className="recommend-care-title">{tip.title}</strong>
                <p className="recommend-care-desc">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gift Recommendations */}
      {prefsLoading ? (
        <div className="recommend-loading">로딩 중...</div>
      ) : ownerHasSurvey && ownerPrefs ? (
        <PartnerGiftSection partnerName={partnerName} preferences={ownerPrefs} />
      ) : (
        <div className="recommend-no-survey">
          <span className="recommend-no-survey-icon">📋</span>
          <p>파트너가 아직 제품 선호도를 입력하지 않았어요.</p>
          <p className="recommend-no-survey-hint">선호도 설문을 부탁해보세요! 💜</p>
        </div>
      )}
    </div>
  )
}

function PartnerGiftSection({
  partnerName,
  preferences,
}: {
  partnerName: string | null
  preferences: import('@/types').PadPreferences
}) {
  const shoppingUrls = buildShoppingUrls(preferences)
  const name = partnerName ?? '파트너'

  return (
    <div className="recommend-gift-section">
      <h3 className="recommend-gift-title">🎁 선물 추천</h3>
      <p className="recommend-gift-summary">
        {name}님은{' '}
        {preferences.brand && <strong>{preferences.brand} </strong>}
        {preferences.product_types.map(t => PRODUCT_TYPE_LABELS[t]).join(', ')}
        을(를) 주로 사용해요
      </p>

      {shoppingUrls.map((urls, idx) => {
        const productType = preferences.product_types[idx] ?? preferences.product_types[0]
        return (
          <div key={idx} className="recommend-product-card">
            <div className="recommend-product-header">
              <span className="recommend-product-icon">{PRODUCT_TYPE_ICONS[productType]}</span>
              <span className="recommend-product-name">{PRODUCT_TYPE_LABELS[productType]}</span>
            </div>
            <p className="recommend-product-desc">이걸 선물해보는 건 어때요?</p>
            <div className="recommend-shop-links">
              <a
                href={urls.naver}
                target="_blank"
                rel="noopener noreferrer"
                className="recommend-shop-btn recommend-shop-btn--naver"
              >
                네이버쇼핑에서 보기
              </a>
              <a
                href={urls.coupang}
                target="_blank"
                rel="noopener noreferrer"
                className="recommend-shop-btn recommend-shop-btn--coupang"
              >
                쿠팡에서 보기
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Main Component
export function RecommendPage() {
  const { isLinked, isLoading } = usePartnerData()

  if (isLoading) {
    return (
      <div className="recommend-page">
        <div className="recommend-loading">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="recommend-page">
      {isLinked ? <PartnerView /> : <OwnerView />}
    </div>
  )
}
