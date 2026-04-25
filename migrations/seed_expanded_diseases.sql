-- Add UNIQUE constraint to disease_name if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'disease_advisories_disease_name_key'
    ) THEN
        ALTER TABLE public.disease_advisories ADD CONSTRAINT disease_advisories_disease_name_key UNIQUE (disease_name);
    END IF;
END $$;

-- Insert new infectious diseases into disease_advisories
INSERT INTO public.disease_advisories (disease_name, status, description)
VALUES 
    ('홍역', 'safe', '예방접종 필수! 전염력이 매우 높습니다.'),
    ('유행성이하선염', 'safe', '볼거리 주의, 위생 관리에 신경 써주세요.'),
    ('풍진', 'safe', '발진 주의, 임신부 접촉을 피해야 합니다.'),
    ('성홍열', 'safe', '고열과 인후통, 철저한 소독이 필요합니다.'),
    ('아데노바이러스', 'safe', '눈병과 장염 동반 가능, 손 씻기 필수.'),
    ('마이코플라즈마', 'safe', '오래가는 기침 주의, 마스크 착용 권장.'),
    ('노로바이러스', 'safe', '겨울철 장염 주의, 음식은 익혀 드세요.'),
    ('로타바이러스', 'safe', '영유아 장염 주의, 기저귀 교체 후 손 씻기.'),
    ('유행성결막염', 'safe', '눈 비비지 않기, 개인용품은 따로 사용하세요.')
ON CONFLICT (disease_name) DO NOTHING;
