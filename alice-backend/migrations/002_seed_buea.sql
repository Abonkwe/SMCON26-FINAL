-- ============================================================================
-- ALICE MARKETPLACE PLATFORM
-- Migration: 002_seed_buea.sql
-- Description: Standalone Buea Seed Data (Neighbourhoods & Launch Categories)
-- ============================================================================

-- 1. Buea Service Areas (11 Core Neighbourhoods)
INSERT INTO public.service_areas (area_id, name, city, active) VALUES
    ('00000000-0000-0000-0001-000000000001', 'Molyko', 'Buea', true),
    ('00000000-0000-0000-0001-000000000002', 'Mile 16 (Bolifamba)', 'Buea', true),
    ('00000000-0000-0000-0001-000000000003', 'Bonduma', 'Buea', true),
    ('00000000-0000-0000-0001-000000000004', 'Great Soppo', 'Buea', true),
    ('00000000-0000-0000-0001-000000000005', 'Bokwango', 'Buea', true),
    ('00000000-0000-0000-0001-000000000006', 'Muea', 'Buea', true),
    ('00000000-0000-0000-0001-000000000007', 'Sandpit', 'Buea', true),
    ('00000000-0000-0000-0001-000000000008', 'CheckPoint', 'Buea', true),
    ('00000000-0000-0000-0001-000000000009', 'Clerks Quarters', 'Buea', true),
    ('00000000-0000-0000-0001-000000000010', 'Federal Quarters', 'Buea', true),
    ('00000000-0000-0000-0001-000000000011', 'Buea Town', 'Buea', true)
ON CONFLICT (name, city) DO UPDATE SET active = EXCLUDED.active;

-- 2. Launch Categories
INSERT INTO public.service_categories (category_id, name_en, name_fr, icon_key, display_order, active) VALUES
    ('00000000-0000-0000-0002-000000000001', 'Repairs & Maintenance', 'Réparations & Entretien', 'wrench', 1, true),
    ('00000000-0000-0000-0002-000000000002', 'Household & Domestic', 'Ménage & Domestique', 'sparkles', 2, true),
    ('00000000-0000-0000-0002-000000000003', 'Essential Supplies', 'Approvisionnements Essentiels', 'droplet', 3, true),
    ('00000000-0000-0000-0002-000000000004', 'Equipment Rentals', 'Location d''Équipements', 'battery-charging', 4, true)
ON CONFLICT (name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    icon_key = EXCLUDED.icon_key,
    display_order = EXCLUDED.display_order;

-- 3. Launch Services with Risk & Competence Requirements
INSERT INTO public.services (service_id, category_id, name_en, name_fr, description, risk_level, requires_competence_verification, active) VALUES
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', 'Plumbing Repairs', 'Réparations de Plomberie', 'Leak fixing, pipe repair, toilet and tap installations', 'MEDIUM', false, true),
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000001', 'Electrical Repairs', 'Réparations Électriques', 'Wiring, breakers, power points, safety checks (requires competence verification)', 'HIGH', true, true),
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000001', 'Water-Pump Repair', 'Réparation de Pompe à Eau', 'Submersible and surface water pump troubleshooting and servicing', 'HIGH', true, true),
    ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000002', 'Home Cleaning', 'Nettoyage à Domicile', 'General home, kitchen, and deep compound cleaning', 'LOW', false, true),
    ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000002', 'Laundry & Ironing', 'Lessive & Repassage', 'Wash, fold, and iron clothes and bedding with local pickup', 'LOW', false, true),
    ('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0002-000000000003', 'Drinking Water Delivery', 'Livraison d''Eau Potable', 'Treated spring / mineral drinking water delivery to doorstep', 'MEDIUM', false, true),
    ('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0002-000000000003', 'Household Water Delivery', 'Livraison d''Eau Domestique', 'Bulk non-potable water tanker / drums for domestic cleaning and storage', 'LOW', false, true),
    ('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0002-000000000003', 'Authorised Cooking Gas Refill', 'Recharge de Bouteille de Gaz Agréée', 'Certified 12.5kg / 6kg domestic butane gas bottle replacement & safety leak test', 'HIGH', true, true),
    ('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0002-000000000004', 'Portable Power Stations', 'Stations Électriques Portables', '1kWh - 3kWh silent lithium battery power stations for blackout resilience', 'MEDIUM', false, true),
    ('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0002-000000000004', 'Backup Generators', 'Groupes Électrogènes de Secours', 'Fuel-powered backup electricity generators with technical safety handover', 'HIGH', true, true)
ON CONFLICT (category_id, name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    risk_level = EXCLUDED.risk_level,
    requires_competence_verification = EXCLUDED.requires_competence_verification;

