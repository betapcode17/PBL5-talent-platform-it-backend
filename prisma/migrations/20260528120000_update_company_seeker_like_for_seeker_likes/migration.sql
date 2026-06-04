CREATE UNIQUE INDEX "CompanySeekerLike_company_id_seeker_id_key" ON "CompanySeekerLike"("company_id", "seeker_id");
CREATE INDEX "CompanySeekerLike_company_id_idx" ON "CompanySeekerLike"("company_id");
CREATE INDEX "CompanySeekerLike_seeker_id_idx" ON "CompanySeekerLike"("seeker_id");
