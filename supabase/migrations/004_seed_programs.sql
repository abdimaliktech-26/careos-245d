-- Programs
INSERT INTO public.programs (name, code, description) VALUES
  ('Individualized Home Supports', 'ihs', 'IHS services per 245D'),
  ('Residential Services', 'residential', 'Residential services per 245D'),
  ('Employment Services', 'employment', 'Employment services per 245D'),
  ('24-Hour Emergency Assistance', 'emergency', '24-hour on-call and emergency response');

-- Intake Forms (14)
INSERT INTO public.form_definitions (form_code, form_name, form_set, sort_order) VALUES
  ('DPF-001',   'Rights of Persons Served',                              'intake', 1),
  ('DPF-002',   'Rights Restrictions',                                   'intake', 2),
  ('DPF-004',   'Admission Form and Data Sheet',                         'intake', 3),
  ('DPF-007',   'Funds and Property Authorization',                      'intake', 4),
  ('DPF-008',   'Policy Orientation Receipt',                            'intake', 5),
  ('DPF-010',   'Standard Release of Information',                       'intake', 6),
  ('DPF-016A',  'Support Plan Addendum for Intensive Support Services',  'intake', 7),
  ('DPF-023',   'Self-Management Assessment',                            'intake', 8),
  ('DPF-039',   'Person-Centered and Positive Support Strategies',       'intake', 9),
  ('DHF-007',   'Authorization for Medication and Treatment Administration', 'intake', 10),
  ('DHF-008',   'Authorization and Agreement for Injectable Medications','intake', 11),
  ('DHF-009',   'Authorization to Act in an Emergency',                  'intake', 12),
  ('DHS-7176',  'Residency Agreement Template',                          'intake', 13),
  ('245D-ABPP', '245D Individual Abuse Prevention Plan Form',            'intake', 14);

-- 45-Day Review Forms (4)
INSERT INTO public.form_definitions (form_code, form_name, form_set, sort_order) VALUES
  ('45D-DPF-017', 'Service Outcome and Support',                         '45day', 1),
  ('45D-DPF-019', 'Progress Report and Recommendations',                 '45day', 2),
  ('45D-DPF-020', 'Service Plan Review Meeting and Attendance Notes',    '45day', 3),
  ('45D-DPF-034', 'Single Dated Signature Page',                         '45day', 4);

-- Semi-Annual Forms (6)
INSERT INTO public.form_definitions (form_code, form_name, form_set, sort_order) VALUES
  ('SA-DPF-012', 'Designated Coordinator Review',                        'semiannual', 1),
  ('SA-DPF-013', 'Designated Manager Review',                            'semiannual', 2),
  ('SA-DPF-017', 'Service Outcome and Support',                          'semiannual', 3),
  ('SA-DPF-019', 'Progress Report and Recommendations',                  'semiannual', 4),
  ('SA-DPF-020', 'Service Plan Review Meeting and Attendance Notes',     'semiannual', 5),
  ('SA-DPF-034', 'Single Dated Signature Page',                          'semiannual', 6);

-- Annual Forms (14 confirmed; 6 more to be added once names confirmed by client)
INSERT INTO public.form_definitions (form_code, form_name, form_set, sort_order) VALUES
  ('AN-DHS-7176',  'Residency Agreement Template',                       'annual', 1),
  ('AN-DPF-001',   'Rights of Persons Served',                           'annual', 2),
  ('AN-DPF-002',   'Rights Restrictions',                                'annual', 3),
  ('AN-DPF-008',   'Policy Orientation Receipt',                         'annual', 4),
  ('AN-DPF-010',   'Standard Release of Information',                    'annual', 5),
  ('AN-DPF-013',   'Designated Manager Review',                          'annual', 6),
  ('AN-DPF-016A',  'Support Plan Addendum for Intensive Support Services','annual', 7),
  ('AN-DPF-017',   'Service Outcome and Support',                        'annual', 8),
  ('AN-DPF-019',   'Progress Report and Recommendations',                'annual', 9),
  ('AN-DPF-023',   'Self-Management Assessment',                         'annual', 10),
  ('AN-DPF-034',   'Single Dated Signature Page',                        'annual', 11),
  ('AN-DPF-039',   'Person-Centered and Positive Support Strategies',    'annual', 12),
  ('AN-DHF-009',   'Authorization to Act in an Emergency',               'annual', 13),
  ('AN-245D-ABPP', '245D Individual Abuse Prevention Plan Form',         'annual', 14);
