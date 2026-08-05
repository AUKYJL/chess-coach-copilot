CREATE TYPE "WeaknessTag" AS ENUM (
    'missed_fork',
    'missed_pin',
    'missed_double_attack',
    'missed_discovered_attack',
    'missed_mate',
    'allowed_mate',
    'hanging_piece',
    'missed_capture',
    'bad_capture',
    'missed_opponent_threat',
    'opened_line',
    'unknown_tactical_error',
    'king_safety',
    'delayed_castling',
    'poor_development',
    'early_queen',
    'bad_trade',
    'poor_conversion',
    'opening_strategy',
    'pawn_structure',
    'endgame_technique',
    'unknown_strategic_error',
    'time_management',
    'calculation_depth',
    'tunnel_vision',
    'material_greed',
    'low_board_awareness',
    'insufficient-annotation-data',
    'reduced-confidence'
);

DO $$
DECLARE
    invalid_main_tags TEXT[];
    invalid_secondary_tags TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT "mainWeaknessTag")
    INTO invalid_main_tags
    FROM "GameAnalysis"
    WHERE "mainWeaknessTag" IS NOT NULL
      AND "mainWeaknessTag" NOT IN (
          'missed_fork',
          'missed_pin',
          'missed_double_attack',
          'missed_discovered_attack',
          'missed_mate',
          'allowed_mate',
          'hanging_piece',
          'missed_capture',
          'bad_capture',
          'missed_opponent_threat',
          'opened_line',
          'unknown_tactical_error',
          'king_safety',
          'delayed_castling',
          'poor_development',
          'early_queen',
          'bad_trade',
          'poor_conversion',
          'opening_strategy',
          'pawn_structure',
          'endgame_technique',
          'unknown_strategic_error',
          'time_management',
          'time-management',
          'calculation_depth',
          'calculation',
          'tunnel_vision',
          'material_greed',
          'low_board_awareness',
          'insufficient-annotation-data',
          'reduced-confidence'
      );

    IF invalid_main_tags IS NOT NULL THEN
        RAISE EXCEPTION 'Unknown GameAnalysis.mainWeaknessTag values: %', invalid_main_tags;
    END IF;

    SELECT ARRAY_AGG(DISTINCT tag)
    INTO invalid_secondary_tags
    FROM (
        SELECT JSONB_ARRAY_ELEMENTS_TEXT("secondaryWeaknessTags") AS tag
        FROM "GameAnalysis"
    ) AS tags
    WHERE tag NOT IN (
        'missed_fork',
        'missed_pin',
        'missed_double_attack',
        'missed_discovered_attack',
        'missed_mate',
        'allowed_mate',
        'hanging_piece',
        'missed_capture',
        'bad_capture',
        'missed_opponent_threat',
        'opened_line',
        'unknown_tactical_error',
        'king_safety',
        'delayed_castling',
        'poor_development',
        'early_queen',
        'bad_trade',
        'poor_conversion',
        'opening_strategy',
        'pawn_structure',
        'endgame_technique',
        'unknown_strategic_error',
        'time_management',
        'time-management',
        'calculation_depth',
        'calculation',
        'tunnel_vision',
        'material_greed',
        'low_board_awareness',
        'insufficient-annotation-data',
        'reduced-confidence'
    );

    IF invalid_secondary_tags IS NOT NULL THEN
        RAISE EXCEPTION 'Unknown GameAnalysis.secondaryWeaknessTags values: %', invalid_secondary_tags;
    END IF;
END $$;

UPDATE "GameAnalysis"
SET "mainWeaknessTag" = CASE
    WHEN "mainWeaknessTag" = 'calculation' THEN 'calculation_depth'
    WHEN "mainWeaknessTag" = 'time-management' THEN 'time_management'
    ELSE "mainWeaknessTag"
END
WHERE "mainWeaknessTag" IN ('calculation', 'time-management');

ALTER TABLE "GameAnalysis"
ALTER COLUMN "mainWeaknessTag" TYPE "WeaknessTag"
USING ("mainWeaknessTag"::"WeaknessTag");

ALTER TABLE "GameAnalysis"
ADD COLUMN "secondaryWeaknessTagsNew" "WeaknessTag"[] NOT NULL DEFAULT ARRAY[]::"WeaknessTag"[];

UPDATE "GameAnalysis"
SET "secondaryWeaknessTagsNew" = ARRAY(
    SELECT CASE tag
        WHEN 'calculation' THEN 'calculation_depth'
        WHEN 'time-management' THEN 'time_management'
        ELSE tag
    END::"WeaknessTag"
    FROM JSONB_ARRAY_ELEMENTS_TEXT("secondaryWeaknessTags") WITH ORDINALITY AS tags(tag, ord)
    ORDER BY ord
);

ALTER TABLE "GameAnalysis"
DROP COLUMN "secondaryWeaknessTags",
RENAME COLUMN "secondaryWeaknessTagsNew" TO "secondaryWeaknessTags";
