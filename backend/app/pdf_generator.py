"""
Professional PDF Report Generator for Medical Reports
Generates A4 format PDF documents with patient details and analysis results.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime
import io
from typing import Dict, List, Optional


class MedicalReportPDF:
    """Generate professional medical reports in PDF format."""
    
    def __init__(self):
        self.width, self.height = A4
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Create custom paragraph styles for medical reports."""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Hospital header
        self.styles.add(ParagraphStyle(
            name='HospitalHeader',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#059669'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold',
            borderPadding=5,
            borderColor=colors.HexColor('#3b82f6'),
            borderWidth=0,
            backColor=colors.HexColor('#eff6ff')
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='ReportBody',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))
        
        # Patient info
        self.styles.add(ParagraphStyle(
            name='PatientInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=13,
            spaceAfter=4
        ))
        
        # Disclaimer
        self.styles.add(ParagraphStyle(
            name='Disclaimer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_JUSTIFY,
            spaceAfter=4
        ))
    
    def _add_header_footer(self, canvas, doc):
        """Add header and footer to each page."""
        canvas.saveState()
        
        # Header
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(colors.HexColor('#1e40af'))
        canvas.drawString(1.5*cm, self.height - 1.5*cm, "NEURO-SHIELD AI")
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        canvas.drawRightString(self.width - 1.5*cm, self.height - 1.5*cm, 
                               f"Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}")
        
        # Header line
        canvas.setStrokeColor(colors.HexColor('#3b82f6'))
        canvas.setLineWidth(1)
        canvas.line(1.5*cm, self.height - 2*cm, self.width - 1.5*cm, self.height - 2*cm)
        
        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        canvas.drawString(1.5*cm, 1.5*cm, "Neuro-Shield AI Health Platform")
        canvas.drawRightString(self.width - 1.5*cm, 1.5*cm, f"Page {doc.page}")
        
        # Footer line
        canvas.setStrokeColor(colors.HexColor('#3b82f6'))
        canvas.setLineWidth(0.5)
        canvas.line(1.5*cm, 2*cm, self.width - 1.5*cm, 2*cm)
        
        canvas.restoreState()
    
    def generate_video_analysis_report(
        self,
        patient_info: Dict,
        analysis_data: Dict,
        medications: List[Dict]
    ) -> bytes:
        """Generate PDF report for video analysis."""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=2.5*cm,
            bottomMargin=2.5*cm
        )
        
        story = []
        
        # Title
        story.append(Paragraph("NEUROLOGICAL ASSESSMENT REPORT", self.styles['HospitalHeader']))
        story.append(Paragraph("NEURO-SHIELD AI Platform", self.styles['HospitalHeader']))
        story.append(Spacer(1, 0.3*cm))
        
        # Report type and date
        report_type = analysis_data.get('analysis_type', 'General').capitalize()
        story.append(Paragraph(f"<b>{report_type} Analysis Report</b>", self.styles['ReportTitle']))
        story.append(Spacer(1, 0.5*cm))
        
        # Patient Information Table
        patient_data = [
            ['Patient Information', ''],
            ['Full Name:', f"{patient_info.get('first_name', '')} {patient_info.get('last_name', '')}"],
            ['Patient ID:', str(patient_info.get('user_id', 'N/A'))],
            ['Age:', f"{patient_info.get('age', 'N/A')} years"],
            ['Gender:', patient_info.get('gender', 'N/A')],
            ['Report Date:', datetime.now().strftime('%B %d, %Y')],
            ['Analysis Type:', report_type]
        ]
        
        patient_table = Table(patient_data, colWidths=[5*cm, 11*cm])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#eff6ff')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        
        story.append(patient_table)
        story.append(Spacer(1, 0.8*cm))
        
        # Analysis Report Content
        story.append(Paragraph("CLINICAL ANALYSIS", self.styles['SectionHeader']))
        story.append(Spacer(1, 0.3*cm))
        
        # Parse and format the report content
        report_content = analysis_data.get('report_content', '')
        
        # Split report into sections
        sections = report_content.split('###')
        for section in sections:
            if section.strip():
                lines = section.strip().split('\n')
                if lines:
                    # First line is section title
                    title = lines[0].replace('#', '').strip()
                    if title and title != 'NEUROLOGICAL ASSESSMENT REPORT':
                        story.append(Paragraph(f"<b>{title}</b>", self.styles['SectionHeader']))
                        story.append(Spacer(1, 0.2*cm))
                    
                    # Rest is content
                    for line in lines[1:]:
                        line = line.strip()
                        if line and not line.startswith('---'):
                            # Format bullet points
                            if line.startswith('-') or line.startswith('•'):
                                line = '  • ' + line[1:].strip()
                            elif line.startswith(('1.', '2.', '3.', '4.', '5.')):
                                pass  # Keep numbered lists as is
                            
                            story.append(Paragraph(line, self.styles['ReportBody']))
                    
                    story.append(Spacer(1, 0.3*cm))
        
        # Recommended Medications
        if medications:
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("RECOMMENDED MEDICATIONS", self.styles['SectionHeader']))
            story.append(Spacer(1, 0.3*cm))
            
            med_data = [['Medication', 'Dosage', 'Frequency', 'Max Daily']]
            for med in medications:
                med_data.append([
                    med.get('name', 'N/A'),
                    med.get('dosage', 'As prescribed'),
                    med.get('frequency', 'As prescribed'),
                    med.get('max_daily', 'Follow advice')
                ])
            
            med_table = Table(med_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
            med_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')])
            ]))
            
            story.append(med_table)
            story.append(Spacer(1, 0.5*cm))
        
        # Disclaimer
        story.append(Spacer(1, 1*cm))
        story.append(Paragraph("<b>IMPORTANT DISCLAIMER</b>", self.styles['Disclaimer']))
        disclaimer_text = """
        This report is generated using AI-assisted analysis and should be used as a supplementary tool only. 
        All findings, diagnoses, and treatment recommendations must be confirmed by a licensed healthcare 
        professional. Do not make any medical decisions based solely on this report. Always consult with 
        your physician or neurologist before starting, stopping, or changing any medication or treatment plan.
        """
        story.append(Paragraph(disclaimer_text, self.styles['Disclaimer']))
        
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(
            f"<i>Report generated by NEURO-SHIELD AI on {datetime.now().strftime('%B %d, %Y at %H:%M')} UTC</i>",
            self.styles['Disclaimer']
        ))
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes


# Global instance
pdf_generator = MedicalReportPDF()
