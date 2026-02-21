"""
Advanced Medication Recommendation Engine
Analyzes symptoms, age, and patient profile to recommend medications with proper dosages.
Uses healthcare_dataset.csv (Kaggle-style) and Gemini AI for intelligent recommendations.
"""

import pandas as pd
import os
from typing import List, Dict, Optional
from datetime import datetime
import aiohttp
from app.database import settings

# Resolve project root: backend/app/medication_engine.py -> go up to project root
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_APP_DIR)
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
_DEFAULT_CSV_PATH = os.path.join(_PROJECT_ROOT, "healthcare_dataset.csv")


class MedicationEngine:
    """Intelligent medication recommendation system."""
    
    def __init__(self):
        self.dataset = None
        self.medication_db = {}
        self._load_dataset()
        self._build_medication_database()
    
    def _load_dataset(self):
        """Load healthcare dataset from CSV (project root or env)."""
        dataset_path = os.environ.get("HEALTHCARE_DATASET_CSV", _DEFAULT_CSV_PATH)
        if not os.path.exists(dataset_path):
            print(f"⚠ Healthcare dataset not found at {dataset_path}")
            return
        try:
            self.dataset = pd.read_csv(dataset_path)
            print(f"✓ Loaded {len(self.dataset)} healthcare records from {dataset_path}")
        except Exception as e:
            print(f"⚠ Error loading dataset: {e}")
    
    def _build_medication_database(self):
        """Build medication knowledge base from dataset."""
        if self.dataset is None:
            return
        col_condition = "Medical Condition"
        col_med = "Medication"
        if col_condition not in self.dataset.columns or col_med not in self.dataset.columns:
            print("⚠ CSV missing Medical Condition or Medication column")
            return
        # Group medications by medical condition
        for condition in self.dataset[col_condition].unique():
            condition_data = self.dataset[self.dataset[col_condition] == condition]
            medications = condition_data[col_med].value_counts().to_dict()
            age_stats = {
                'min': int(condition_data['Age'].min()),
                'max': int(condition_data['Age'].max()),
                'mean': int(condition_data['Age'].mean())
            }
            self.medication_db[str(condition).strip()] = {
                'medications': medications,
                'age_stats': age_stats,
                'total_cases': len(condition_data)
            }
        # Build "General" from whole dataset for fever/cold/headache
        all_meds = self.dataset[col_med].value_counts().to_dict()
        self.medication_db["General"] = {
            'medications': dict(list(all_meds.items())[:10]),
            'age_stats': {'min': int(self.dataset['Age'].min()), 'max': int(self.dataset['Age'].max()), 'mean': int(self.dataset['Age'].mean())},
            'total_cases': len(self.dataset)
        }
    
    def _get_dosage_by_age(self, medication: str, age: int) -> Dict[str, str]:
        """Calculate age-appropriate dosage for medication."""
        
        # Standard dosage guidelines by age group
        dosage_guidelines = {
            'Paracetamol': {
                'child': {'age_range': (0, 12), 'dosage': '250-500mg', 'frequency': 'every 6 hours', 'max_daily': '2000mg'},
                'teen': {'age_range': (13, 17), 'dosage': '500-750mg', 'frequency': 'every 6 hours', 'max_daily': '3000mg'},
                'adult': {'age_range': (18, 64), 'dosage': '500-1000mg', 'frequency': 'every 6 hours', 'max_daily': '4000mg'},
                'senior': {'age_range': (65, 120), 'dosage': '500mg', 'frequency': 'every 6 hours', 'max_daily': '3000mg'}
            },
            'Ibuprofen': {
                'child': {'age_range': (0, 12), 'dosage': '200mg', 'frequency': 'every 8 hours', 'max_daily': '600mg'},
                'teen': {'age_range': (13, 17), 'dosage': '200-400mg', 'frequency': 'every 6-8 hours', 'max_daily': '1200mg'},
                'adult': {'age_range': (18, 64), 'dosage': '400-600mg', 'frequency': 'every 6-8 hours', 'max_daily': '2400mg'},
                'senior': {'age_range': (65, 120), 'dosage': '200-400mg', 'frequency': 'every 8 hours', 'max_daily': '1200mg'}
            },
            'Aspirin': {
                'child': {'age_range': (0, 12), 'dosage': 'Not recommended (Reye syndrome risk)', 'frequency': '', 'max_daily': ''},
                'teen': {'age_range': (13, 17), 'dosage': '325mg', 'frequency': 'every 4-6 hours', 'max_daily': '3900mg'},
                'adult': {'age_range': (18, 64), 'dosage': '325-650mg', 'frequency': 'every 4-6 hours', 'max_daily': '4000mg'},
                'senior': {'age_range': (65, 120), 'dosage': '81-325mg', 'frequency': 'once daily (cardioprotective)', 'max_daily': '325mg'}
            },
            'Lipitor': {
                'child': {'age_range': (0, 12), 'dosage': 'Consult pediatrician', 'frequency': '', 'max_daily': ''},
                'teen': {'age_range': (13, 17), 'dosage': '10-20mg', 'frequency': 'once daily', 'max_daily': '20mg'},
                'adult': {'age_range': (18, 64), 'dosage': '10-80mg', 'frequency': 'once daily', 'max_daily': '80mg'},
                'senior': {'age_range': (65, 120), 'dosage': '10-40mg', 'frequency': 'once daily', 'max_daily': '40mg'}
            },
            'Penicillin': {
                'child': {'age_range': (0, 12), 'dosage': '250mg', 'frequency': 'every 8 hours', 'max_daily': '750mg'},
                'teen': {'age_range': (13, 17), 'dosage': '500mg', 'frequency': 'every 8 hours', 'max_daily': '1500mg'},
                'adult': {'age_range': (18, 64), 'dosage': '500-1000mg', 'frequency': 'every 6-8 hours', 'max_daily': '4000mg'},
                'senior': {'age_range': (65, 120), 'dosage': '500mg', 'frequency': 'every 8 hours', 'max_daily': '1500mg'}
            }
        }
        
        # Get medication guidelines
        if medication not in dosage_guidelines:
            # Default for unknown medications
            return {
                'dosage': 'As prescribed by doctor',
                'frequency': 'As prescribed',
                'max_daily': 'Follow medical advice',
                'warning': 'Consult healthcare provider for proper dosage'
            }
        
        med_guide = dosage_guidelines[medication]
        
        # Find appropriate age group
        for age_group, details in med_guide.items():
            age_min, age_max = details['age_range']
            if age_min <= age <= age_max:
                return {
                    'dosage': details['dosage'],
                    'frequency': details['frequency'],
                    'max_daily': details['max_daily'],
                    'age_group': age_group.capitalize()
                }
        
        return {
            'dosage': 'Consult doctor',
            'frequency': 'As prescribed',
            'max_daily': 'Follow medical advice'
        }
    
    async def _get_gemini_recommendation(self, symptoms: str, age: int, medical_history: Optional[str] = None) -> str:
        """Use Gemini AI to analyze symptoms and provide medication insights."""
        if not settings.GEMINI_API_KEY:
            return ""
        prompt = f"""You are a medical AI assistant. Analyze the following and give a short, clear recommendation.

Patient Age: {age} years
Symptoms: {symptoms}
Medical History: {medical_history or 'Not provided'}

Provide:
1. Likely condition or cause (one of: General/fever, Diabetes, Hypertension, Asthma, Arthritis, Obesity, or other - be brief).
2. Suggested OTC or common medications (e.g. Paracetamol, Ibuprofen, Aspirin, Lipitor, Penicillin where appropriate) with brief dosage hint for age.
3. One or two important precautions.
4. When to see a doctor.

Write in clear, professional but concise paragraphs. Do not diagnose; recommend consulting a doctor for confirmation."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1000}
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=30) as response:
                    data = await response.json()
            candidates = data.get("candidates", [])
            if candidates:
                return candidates[0]["content"]["parts"][0].get("text", "")
        except Exception as e:
            print(f"Gemini API error: {e}")
        return ""
    
    def _match_symptoms_to_condition(self, symptoms: str) -> Optional[str]:
        """Match patient symptoms to medical conditions in dataset (including fever, cold, etc.)."""
        symptoms_lower = symptoms.strip().lower()
        if not symptoms_lower:
            return None
        # General / OTC symptoms -> use "General" (top meds from full dataset: Paracetamol, Ibuprofen, etc.)
        general_keywords = ['fever', 'cold', 'cough', 'headache', 'body ache', 'pain', 'sore throat', 'runny nose', 'flu', 'temperature', 'aching', 'mild pain']
        if any(kw in symptoms_lower for kw in general_keywords):
            # If only general symptoms, return General so we get Paracetamol/Ibuprofen from dataset
            other_conditions = ['diabetes', 'hypertension', 'asthma', 'arthritis', 'obesity', 'cancer', 'sugar', 'blood pressure', 'joint', 'wheezing', 'tumor']
            if not any(oc in symptoms_lower for oc in other_conditions):
                return "General"
        # Symptom-to-condition mapping (dataset conditions: Diabetes, Hypertension, Asthma, Arthritis, Obesity, Cancer)
        symptom_map = {
            'Diabetes': ['sugar', 'glucose', 'thirst', 'frequent urination', 'fatigue', 'blurred vision', 'diabetes', 'diabetic'],
            'Hypertension': ['blood pressure', 'hypertension', 'headache', 'dizziness', 'chest pain', 'shortness of breath', 'high bp'],
            'Asthma': ['wheezing', 'breathing', 'cough', 'chest tightness', 'shortness of breath', 'asthma', 'respiration'],
            'Arthritis': ['joint pain', 'stiffness', 'swelling', 'reduced mobility', 'inflammation', 'arthritis', 'joints'],
            'Obesity': ['overweight', 'weight gain', 'bmi', 'excess weight', 'obesity'],
            'Cancer': ['mass', 'tumor', 'lump', 'unexplained weight loss', 'fatigue', 'cancer']
        }
        best_match = None
        max_matches = 0
        for condition, keywords in symptom_map.items():
            matches = sum(1 for keyword in keywords if keyword in symptoms_lower)
            if matches > max_matches:
                max_matches = matches
                best_match = condition
        return best_match
    
    async def recommend_medications(
        self,
        symptoms: str,
        age: int,
        patient_profile: Optional[Dict] = None,
        conditions: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate intelligent medication recommendations based on symptoms and age.
        
        Args:
            symptoms: Patient's described symptoms
            age: Patient's age
            patient_profile: Optional patient medical history and profile
            
        Returns:
            Comprehensive medication recommendation with dosages and AI insights
        """
        
        # Step 1: Match symptoms/conditions to medical condition
        matched_condition = None
        if conditions:
            normalized = {c.strip().lower() for c in conditions if c and c.strip()}
            for condition_name in self.medication_db.keys():
                if condition_name.lower() in normalized:
                    matched_condition = condition_name
                    break

        if not matched_condition:
            matched_condition = self._match_symptoms_to_condition(symptoms)
        
        # Step 2: Get medications from dataset
        recommended_meds = []
        age = age or 30
        if matched_condition and matched_condition in self.medication_db:
            condition_info = self.medication_db[matched_condition]
            
            # Get top 3 most common medications for this condition
            top_meds = sorted(
                condition_info['medications'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3]
            
            for med_name, usage_count in top_meds:
                dosage_info = self._get_dosage_by_age(med_name, age)
                
                recommended_meds.append({
                    'name': med_name,
                    'dosage': dosage_info.get('dosage', 'As prescribed'),
                    'frequency': dosage_info.get('frequency', 'As prescribed'),
                    'max_daily': dosage_info.get('max_daily', 'Follow medical advice'),
                    'age_group': dosage_info.get('age_group', 'General'),
                    'usage_in_dataset': usage_count,
                    'confidence': round((usage_count / condition_info['total_cases']) * 100, 1)
                })
        
        # Step 3: Get AI analysis from Gemini
        medical_history = None
        if patient_profile:
            medical_history = patient_profile.get('medical_history', '')
        
        ai_analysis = await self._get_gemini_recommendation(symptoms, age, medical_history)
        
        # Step 4: Compile comprehensive response
        return {
            'success': True,
            'patient_age': age,
            'symptoms_provided': symptoms,
            'matched_condition': matched_condition or 'Condition requires professional diagnosis',
            'medications': recommended_meds,
            'ai_analysis': ai_analysis,
            'dataset_stats': {
                'total_cases_analyzed': self.medication_db.get(matched_condition, {}).get('total_cases', 0),
                'age_range_in_dataset': self.medication_db.get(matched_condition, {}).get('age_stats', {})
            },
            'disclaimer': 'This is an AI-assisted recommendation. Always consult with a licensed healthcare provider before taking any medication.',
            'generated_at': datetime.utcnow().isoformat()
        }


# Global instance
medication_engine = MedicationEngine() 