-- ============================================================
-- Seed Data: Help Center Articles
-- ============================================================
-- Run this AFTER the migration 202606080021_help_center.sql
-- These are global articles (organization_id = NULL) visible to all orgs.
-- ============================================================

INSERT INTO help_articles (organization_id, title, slug, content, excerpt, category, tags, is_published, created_by, updated_by) VALUES

-- Getting Started
(NULL, 'Getting Started with CareIntake', 'getting-started-with-careintake',
'<h2>Welcome to CareIntake</h2>
<p>CareIntake is a comprehensive 245D compliance suite designed for Minnesota home and community-based service providers. This guide will help you get oriented with the platform.</p>

<h2>Your Dashboard</h2>
<p>When you first log in, you''ll see your personalized dashboard with:</p>
<ul>
  <li><strong>Compliance Score</strong> — Overview of your organization''s current compliance status</li>
  <li><strong>Upcoming Packets</strong> — Review deadlines and due dates</li>
  <li><strong>Recent Activity</strong> — Latest actions across your team</li>
  <li><strong>Quick Actions</strong> — Common tasks like creating a client or starting a packet</li>
</ul>

<h2>Navigation</h2>
<p>The sidebar on the left provides access to all major sections:</p>
<ul>
  <li><strong>Clients</strong> — Manage service recipients and their information</li>
  <li><strong>Packets</strong> — Create and manage review packets (Intake, 45-Day, Semi-Annual, Annual)</li>
  <li><strong>T-Log / Notes</strong> — Daily shift notes and communication logs</li>
  <li><strong>Schedule</strong> — Staff scheduling and shift management</li>
  <li><strong>EVV</strong> — Electronic Visit Verification for check-in/check-out</li>
  <li><strong>Incidents</strong> — Incident reporting and management</li>
  <li><strong>Billing Readiness</strong> — Claims, authorizations, and billing preparation</li>
  <li><strong>Documents</strong> — Document vault for file storage</li>
  <li><strong>Form Library</strong> — Custom form templates</li>
</ul>

<h2>Your Profile</h2>
<p>Click on your name in the bottom-left corner to access your profile settings. Here you can update your name, email, and preferences.</p>',
'A comprehensive overview of CareIntake''s features, navigation, and getting started with the 245D compliance suite.',
'getting-started', ARRAY['welcome', 'orientation', 'dashboard', 'basics'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Clients
(NULL, 'How to Create a Client', 'how-to-create-a-client',
'<h2>Adding a New Client</h2>
<p>Follow these steps to add a new client (service recipient) to CareIntake.</p>

<h2>Step 1: Navigate to Clients</h2>
<p>Click on <strong>Clients</strong> in the sidebar navigation to open the client directory.</p>

<h2>Step 2: Click "Add Client"</h2>
<p>Click the <strong>+ Add Client</strong> button in the top-right corner of the client list.</p>

<h2>Step 3: Fill in Client Information</h2>
<p>Complete the following required fields:</p>
<ul>
  <li><strong>Legal Name</strong> — Full legal name as it appears on identification</li>
  <li><strong>Date of Birth</strong> — Client''s date of birth</li>
  <li><strong>Program Type</strong> — ICS, ICLS, IHS, Employment Services, Day Services, or Residential</li>
  <li><strong>Waiver Type</strong> — CAC, CADI, DD, BI, EW, or AC</li>
  <li><strong>County of Service</strong> — The county responsible for the client''s services</li>
  <li><strong>Service Start Date</strong> — When services began or will begin</li>
  <li><strong>Medicaid Number (MA)</strong> — Client''s Medical Assistance number</li>
</ul>

<h2>Step 4: Additional Information</h2>
<p>You can also add optional information including:</p>
<ul>
  <li>Preferred name, gender, primary language</li>
  <li>Home address and contact information</li>
  <li>Case manager details</li>
  <li>Guardianship information</li>
  <li>Staff assignment</li>
  <li>Notes</li>
</ul>

<h2>Step 5: Save</h2>
<p>Click <strong>Save</strong> to create the client record. The new client will appear in your client directory and will be available for packet creation and other workflows.</p>',
'Step-by-step guide to creating a new client record including required fields, program enrollment, and contact information.',
'clients-staff', ARRAY['client', 'create', 'intake', 'onboarding'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Forms & Packets
(NULL, 'Managing Packets & Forms', 'managing-packets-and-forms',
'<h2>Understanding Packets</h2>
<p>Packets are collections of forms organized by review type. CareIntake supports four packet types:</p>
<ul>
  <li><strong>Intake</strong> — Initial enrollment packet</li>
  <li><strong>45-Day Review</strong> — First review within 45 days of service start</li>
  <li><strong>Semi-Annual Review</strong> — Six-month review</li>
  <li><strong>Annual Review</strong> — Yearly review</li>
</ul>

<h2>Creating a Packet</h2>
<ol>
  <li>Navigate to <strong>Packets</strong> in the sidebar</li>
  <li>Click <strong>+ New Packet</strong></li>
  <li>Select the client and packet type</li>
  <li>Set the due date</li>
  <li>Optionally assign to a staff member</li>
  <li>Click <strong>Create</strong></li>
</ol>

<h2>Completing Forms</h2>
<p>Each packet contains one or more forms based on your organization''s form templates:</p>
<ul>
  <li>Click on a packet to view its forms</li>
  <li>Click <strong>Fill Out</strong> on a form to start completing it</li>
  <li>Forms can be saved as drafts and completed later</li>
  <li>Once all required fields are filled, submit the form</li>
  <li>Forms may require signatures from the client, guardian, or staff</li>
</ul>

<h2>Packet Statuses</h2>
<ul>
  <li><strong>Not Started</strong> — No work has been done</li>
  <li><strong>In Progress</strong> — Forms are being completed</li>
  <li><strong>Needs Signature</strong> — All forms are complete, signatures pending</li>
  <li><strong>Completed</strong> — All forms and signatures are done</li>
  <li><strong>Overdue</strong> — Past the due date</li>
</ul>

<h2>Kanban View</h2>
<p>Use the Kanban board to visualize packet progress. Drag and drop packets between status columns for quick updates.</p>',
'Learn how to create, manage, and complete packets and forms for 245D compliance reviews.',
'forms-packets', ARRAY['packets', 'forms', 'reviews', 'intake', 'compliance'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Signatures
(NULL, 'How to Send a Document for Signature', 'send-document-for-signature',
'<h2>Sending for Signature</h2>
<p>CareIntake allows you to send documents for electronic signature to clients, guardians, and other parties.</p>

<h2>Method 1: From a Packet</h2>
<ol>
  <li>Open a packet that has completed forms</li>
  <li>Click <strong>Send for Signature</strong></li>
  <li>Enter the signer''s name and email address</li>
  <li>Select the signer''s role (Client, Guardian, Staff, etc.)</li>
  <li>Choose which forms need signatures</li>
  <li>Click <strong>Send</strong></li>
</ol>

<h2>Method 2: Using the Signing Link Feature</h2>
<ol>
  <li>Navigate to the packet''s signing section</li>
  <li>Click <strong>Generate Signing Link</strong></li>
  <li>A secure link will be generated</li>
  <li>Copy the link and share it with the signer via email, text, or print</li>
  <li>The link expires after 30 days for security</li>
</ol>

<h2>What the Signer Sees</h2>
<p>When the signer opens the link, they will see a clean, mobile-friendly view of the document with signature fields clearly marked. They can:</p>
<ul>
  <li>Draw their signature using mouse or touch</li>
  <li>Type their name as a legal signature</li>
  <li>Review the document before signing</li>
</ul>

<h2>Tracking Signatures</h2>
<p>You can track the status of signature requests from the packet detail page. The system logs when the link was accessed, when the document was signed, and the signer''s IP address for audit purposes.</p>',
'Guide to sending documents for electronic signature to clients, guardians, and other parties.',
'forms-packets', ARRAY['signature', 'esign', 'documents', 'signing'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Incidents
(NULL, 'Reporting an Incident', 'reporting-an-incident',
'<h2>Incident Reporting in CareIntake</h2>
<p>CareIntake provides a comprehensive incident management system in compliance with Minnesota 245D incident reporting requirements.</p>

<h2>Types of Incidents</h2>
<ul>
  <li><strong>Injury</strong> — Physical injury requiring medical attention</li>
  <li><strong>Medication Error</strong> — Wrong medication, dose, or missed medication</li>
  <li><strong>Behavioral Incident</strong> — Significant behavioral episodes</li>
  <li><strong>Emergency Manual Restraint</strong> — When restraint procedures are used</li>
  <li><strong>Maltreatment Concern</strong> — Suspected abuse, neglect, or exploitation</li>
  <li><strong>Death</strong> — Client death</li>
  <li><strong>Property Damage</strong> — Significant damage to property</li>
  <li><strong>Elopement</strong> — Client leaves without authorization</li>
  <li><strong>Other</strong> — Any other significant event</li>
</ul>

<h2>How to Report an Incident</h2>
<ol>
  <li>Go to <strong>Incidents</strong> in the sidebar</li>
  <li>Click <strong>+ Report Incident</strong></li>
  <li>Select the <strong>category</strong> that best describes the incident</li>
  <li>Enter the <strong>date and time</strong> the incident occurred</li>
  <li>Select the <strong>client</strong> involved (if applicable)</li>
  <li>Provide a detailed <strong>description</strong> of what happened</li>
  <li>Document any <strong>immediate actions</strong> taken</li>
  <li>Note any <strong>staff involved</strong></li>
  <li>Attach supporting <strong>documents or photos</strong> if needed</li>
  <li>Click <strong>Submit</strong></li>
</ol>

<h2>Incident Workflow</h2>
<ol>
  <li><strong>Open</strong> — Newly reported, awaiting review</li>
  <li><strong>Under Review</strong> — Being investigated by management</li>
  <li><strong>Closed</strong> — Investigation complete</li>
  <li><strong>Reported to State</strong> — Filed with DHS as required by 245D</li>
</ol>

<h2>Notifications</h2>
<p>Depending on your organization''s policies, incident reports may trigger notifications to:</p>
<ul>
  <li>Guardians (within 24 hours for certain incident types)</li>
  <li>Case managers</li>
  <li>DHS (for serious incidents as required by 245D)</li>
</ul>',
'How to report, classify, and manage incidents in compliance with 245D requirements.',
'incidents', ARRAY['incident', 'reporting', '245D', 'compliance', 'safety'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Schedule
(NULL, 'Using the Schedule', 'using-the-schedule',
'<h2>Schedule Management</h2>
<p>The CareIntake schedule module helps you manage staff assignments, shifts, and visit tracking.</p>

<h2>Viewing the Schedule</h2>
<p>Navigate to <strong>Schedule</strong> in the sidebar to see the weekly calendar view. You can:</p>
<ul>
  <li>Toggle between week and month views</li>
  <li>Filter by staff member or client</li>
  <li>See upcoming and past shifts</li>
  <li>View EVV check-in/check-out status</li>
</ul>

<h2>Creating a Shift</h2>
<ol>
  <li>Click on any time slot in the schedule</li>
  <li>Select the <strong>staff member</strong></li>
  <li>Select the <strong>client</strong></li>
  <li>Set the <strong>start and end time</strong></li>
  <li>Add any <strong>notes</strong> or special instructions</li>
  <li>Click <strong>Save</strong></li>
</ol>

<h2>Managing Shifts</h2>
<ul>
  <li>Click on an existing shift to edit or cancel it</li>
  <li>Drag and drop to reschedule</li>
  <li>Use the copy function to repeat recurring shifts</li>
  <li>View staff availability and conflicts</li>
</ul>

<h2>Schedule and EVV Integration</h2>
<p>Scheduled shifts automatically generate EVV visit records. Staff can check in and out using the EVV module, and the schedule will reflect the visit status in real time.</p>',
'Guide to creating, managing, and viewing staff schedules and shifts in CareIntake.',
'schedule', ARRAY['schedule', 'shifts', 'staff', 'calendar'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- EVV
(NULL, 'EVV Check-in/Check-out', 'evv-check-in-check-out',
'<h2>Electronic Visit Verification (EVV)</h2>
<p>EVV is a federal requirement for Medicaid-funded personal care services. CareIntake''s EVV system verifies that services were actually delivered by tracking:</p>
<ul>
  <li><strong>Who</strong> — Which staff member provided the service</li>
  <li><strong>What</strong> — What type of service was provided</li>
  <li><strong>Where</strong> — The location of the service (GPS verified)</li>
  <li><strong>When</strong> — The start and end time of the visit</li>
</ul>

<h2>Checking In</h2>
<ol>
  <li>Navigate to <strong>EVV</strong> in the sidebar</li>
  <li>You''ll see your scheduled shifts for today</li>
  <li>Click <strong>Check In</strong> on the appropriate shift</li>
  <li>Your GPS location will be recorded automatically</li>
  <li>The system will verify you are at the correct service location</li>
  <li>Confirm to start the visit</li>
</ol>

<h2>Checking Out</h2>
<ol>
  <li>When the service is complete, click <strong>Check Out</strong></li>
  <li>Your GPS location is recorded again</li>
  <li>The visit duration is calculated</li>
  <li>Add any visit notes if needed</li>
  <li>Confirm to complete the visit</li>
</ol>

<h2>Troubleshooting</h2>
<ul>
  <li><strong>GPS not accurate?</strong> Make sure location services are enabled on your device</li>
  <li><strong>Wrong location?</strong> Contact your supervisor to adjust the service address</li>
  <li><strong>Missed check-in?</strong> Staff with appropriate permissions can create a manual visit record</li>
  <li><strong>Connection issues?</strong> EVV works offline — visits are queued and sync when connectivity returns</li>
</ul>',
'How to use EVV check-in and check-out for visit verification, including GPS tracking and troubleshooting.',
'evv', ARRAY['evv', 'visit', 'verification', 'gps', 'check-in'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Billing
(NULL, 'Billing & Claims Guide', 'billing-and-claims-guide',
'<h2>Billing Readiness Overview</h2>
<p>The Billing Readiness module helps you prepare claims for submission to Minnesota''s billing systems. It checks that all required documentation is complete before a claim is generated.</p>

<h2>Key Concepts</h2>
<ul>
  <li><strong>Claims</strong> — Requests for payment for services rendered</li>
  <li><strong>Authorizations</strong> — Approved service units and timeframes from the county or managed care organization</li>
  <li><strong>Service Auths</strong> — Specific authorizations tied to services and clients</li>
  <li><strong>Billing Readiness Score</strong> — A score indicating how ready your claims are for submission</li>
</ul>

<h2>Managing Authorizations</h2>
<ol>
  <li>Go to <strong>Authorizations</strong> in the Billing Readiness section</li>
  <li>Click <strong>+ Add Authorization</strong></li>
  <li>Select the client and service type</li>
  <li>Enter authorized units, start date, and end date</li>
  <li>Upload supporting documentation if applicable</li>
  <li>Click <strong>Save</strong></li>
</ol>

<h2>Creating Claims</h2>
<ol>
  <li>Navigate to <strong>Claims</strong> in the Billing Readiness section</li>
  <li>Click <strong>+ New Claim</strong></li>
  <li>Select the client and service period</li>
  <li>The system will check billing readiness and flag any missing items</li>
  <li>Review and resolve any issues</li>
  <li>Submit the claim</li>
</ol>

<h2>Claim Statuses</h2>
<ul>
  <li><strong>Draft</strong> — Being prepared</li>
  <li><strong>Ready</strong> — All checks passed, ready to submit</li>
  <li><strong>Submitted</strong> — Sent to the billing system</li>
  <li><strong>Paid</strong> — Payment received</li>
  <li><strong>Denied</strong> — Claim was rejected (see reason for details)</li>
</ul>',
'Overview of billing readiness, claims management, and authorizations in CareIntake.',
'billing', ARRAY['billing', 'claims', 'authorizations', 'reimbursement'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'),

-- Compliance
(NULL, 'Understanding Compliance Scores', 'understanding-compliance-scores',
'<h2>What is a Compliance Score?</h2>
<p>The compliance score is a metric that measures how well your organization is meeting 245D documentation requirements. It ranges from 0 to 100, with higher scores indicating better compliance.</p>

<h2>How Scores Are Calculated</h2>
<p>Compliance scores are calculated per packet based on several factors:</p>
<ul>
  <li><strong>Completeness</strong> — Are all required forms filled out?</li>
  <li><strong>Timeliness</strong> — Were reviews completed by their due dates?</li>
  <li><strong>Signatures</strong> — Are all required signatures obtained?</li>
  <li><strong>Accuracy</strong> — Do the forms have complete and accurate information?</li>
  <li><strong>Attachment Completeness</strong> — Are required documents and attachments present?</li>
</ul>

<h2>Where to Find Your Scores</h2>
<ul>
  <li><strong>Dashboard</strong> — Overall organization compliance score</li>
  <li><strong>Packets</strong> — Individual packet compliance score</li>
  <li><strong>Analytics</strong> — Trends and breakdowns</li>
  <li><strong>AI Audit Assistant</strong> — Detailed compliance analysis with recommendations</li>
</ul>

<h2>Improving Your Score</h2>
<ul>
  <li>Complete forms thoroughly and promptly</li>
  <li>Ensure all packets are assigned and tracked</li>
  <li>Use the AI Audit Assistant to identify gaps</li>
  <li>Train staff on documentation requirements</li>
  <li>Set up automated reminders for upcoming reviews</li>
</ul>

<h2>Score Ranges</h2>
<ul>
  <li><strong>90-100</strong> — Excellent compliance</li>
  <li><strong>70-89</strong> — Good, with room for improvement</li>
  <li><strong>50-69</strong> — Needs attention</li>
  <li><strong>Below 50</strong> — Significant compliance risk</li>
</ul>',
'Learn how compliance scores are calculated, where to find them, and how to improve your organization''s score.',
'getting-started', ARRAY['compliance', 'scores', '245D', 'audit'], TRUE, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
