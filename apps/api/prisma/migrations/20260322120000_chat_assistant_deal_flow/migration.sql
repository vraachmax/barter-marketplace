-- Одноразовый сценарий помощника: вопрос о сделке, антискам, приглашение к отзыву
ALTER TABLE "Chat" ADD COLUMN "assistantDealFlowAt" TIMESTAMP(3);
