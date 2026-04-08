-- chat_messages 테이블에 읽음 여부 컬럼 추가
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 기존 메시지들은 읽음으로 처리 (선택 사항)
-- UPDATE public.chat_messages SET is_read = true;

-- 성능 향상을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON public.chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
