import React, { useState } from 'react'
import { uploadImage } from '../services/communityService'
import { compressImage } from '../utils/imageUtils'
import { ImagePlus, X } from 'lucide-react'

export default function PostModal({ isOpen, onClose, onSubmit, user, activeCategory }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const clearImage = () => {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
  }

  const handleClose = () => {
    clearImage()
    setTitle('')
    setContent('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !content) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    let image_url = null
    
    if (imageFile) {
      try {
        // 이미지 서버 업로드 전 브라우저에서 압축 진행 (비용 절감)
        const compressed = await compressImage(imageFile, { quality: 0.7, maxWidth: 1280 })
        image_url = await uploadImage(compressed)
      } catch (err) {
        console.error('Image optimization failed:', err)
        alert('이미지 최적화 및 업로드 중 오류가 발생했습니다.')
        setIsSubmitting(false)
        return
      }
    }

    const postData = { 
      title, 
      content, 
      user_id: user?.id, // RLS 정책을 위해 user_id 명시
      author: user?.profile?.nickname || '익명',
      category_type: activeCategory,
      likes: 0,
      comments_count: 0
    }
    
    if (image_url) {
      postData.image_url = image_url
    }

    const success = await onSubmit(postData)
    
    if (success) {
      handleClose()
    } else {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }} onClick={handleClose}>
      <div 
        style={{
          width: '100%', maxWidth: 480, background: 'white',
          borderRadius: '30px 30px 0 0', padding: 30,
          animation: 'fadeIn 0.3s ease-out',
          maxHeight: '90vh', overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2>새 글 작성</h2>
          <button onClick={handleClose} style={{ border: 'none', background: 'none', fontSize: '20px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <input 
            placeholder="제목을 입력하세요"
            style={{ width: '100%', padding: '12px 0', border: 'none', borderBottom: '1px solid #eee', fontSize: '18px', fontWeight: 'bold', outline: 'none', marginBottom: 20 }}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea 
            placeholder="따뜻한 이야기를 남겨주세요."
            style={{ width: '100%', height: 180, border: 'none', fontSize: '16px', resize: 'none', outline: 'none', marginBottom: 10 }}
            value={content}
            onChange={e => setContent(e.target.value)}
          />

          {imagePreview ? (
            <div style={{ position: 'relative', marginBottom: 20, display: 'inline-block' }}>
              <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, objectFit: 'cover' }} />
              <button
                type="button"
                onClick={clearImage}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                  borderRadius: '50%', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '10px 16px', background: '#f5f6f8', borderRadius: 20,
                color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500'
              }}>
                <ImagePlus size={18} />
                <span>사진 추가하기</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: 16 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? '글 올리는 중...' : '등록하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
