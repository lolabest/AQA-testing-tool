-- Persist deterministic compiler output alongside the immutable test-case revision.
ALTER TABLE "TestCaseVersion"
ADD COLUMN "compiledCode" TEXT,
ADD COLUMN "compiledChecksum" TEXT,
ADD COLUMN "compilerVersion" TEXT,
ADD COLUMN "schemaVersion" TEXT;

CREATE INDEX "TestCaseVersion_compiledChecksum_idx"
ON "TestCaseVersion"("compiledChecksum");
