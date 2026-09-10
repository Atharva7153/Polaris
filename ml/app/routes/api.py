from fastapi import APIRouter
from app.models.schemas import (
    TelemetryData,
    AnomalyResponse,
    FailurePredictionResponse,
    RiskAnalysisResponse,
    AIAnalysisRequest,
    AIAnalysisResponse,
    CascadeRiskRequest,
    SimulationRequest,
    UnifiedIntelligenceResponse
)
from app.services.anomaly_service import detect_anomaly
from app.services.failure_prediction_service import predict_failure
from app.services.risk_service import evaluate_overall_risk
from app.services.cascade_risk_service import calculate_cascade_risks
from app.services.simulation_service import run_simulation
from app.services.decision_service import generate_decision
from app.services.groq_service import generate_ai_analysis

router = APIRouter()

@router.post("/anomaly-detection", response_model=AnomalyResponse)
def api_detect_anomaly(data: TelemetryData):
    result = detect_anomaly(data.dict())
    return {
        "assetId": data.assetId,
        "anomaly": {
            "detected": result["detected"],
            "score": result["score"],
            "confidence": result["confidence"]
        },
        "riskLevel": result["riskLevel"]
    }

@router.post("/failure-prediction", response_model=FailurePredictionResponse)
def api_predict_failure(data: TelemetryData):
    result = predict_failure(data.dict())
    return {
        "assetId": data.assetId,
        "failurePrediction": {
            "probability": result["probability"],
            "confidence": result["confidence"]
        },
        "riskLevel": result["riskLevel"]
    }

@router.post("/risk-analysis", response_model=RiskAnalysisResponse)
def api_risk_analysis(data: TelemetryData):
    data_dict = data.dict()
    anomaly_result = detect_anomaly(data_dict)
    failure_result = predict_failure(data_dict)
    
    risk_result = evaluate_overall_risk(anomaly_result, failure_result)
    
    return {
        "assetId": data.assetId,
        "anomaly": {
            "detected": anomaly_result["detected"],
            "score": anomaly_result["score"],
            "confidence": anomaly_result["confidence"]
        },
        "failurePrediction": {
            "probability": failure_result["probability"],
            "confidence": failure_result["confidence"]
        },
        "risk": risk_result
    }

@router.post("/cascade-risk")
def api_cascade_risk(data: CascadeRiskRequest):
    return calculate_cascade_risks([asset.dict() for asset in data.assets])

@router.post("/simulation")
def api_simulation(data: SimulationRequest):
    return run_simulation(data.assetId, data.baseline, data.changes)

@router.post("/unified-intelligence", response_model=UnifiedIntelligenceResponse)
def api_unified_intelligence(data: TelemetryData):
    """
    Combined endpoint that runs all deterministic ML layers and returns
    a structure ready for Node.js integration.
    """
    data_dict = data.dict()
    
    # 1. Base ML predictions
    anomaly_result = detect_anomaly(data_dict)
    failure_result = predict_failure(data_dict)
    risk_result = evaluate_overall_risk(anomaly_result, failure_result)
    
    # 2. Cascading effects
    cascade_input = [{
        "assetId": data.assetId,
        "failureProbability": failure_result["probability"],
        "anomalyScore": anomaly_result["score"],
        "criticality": "CRITICAL"
    }]
    cascade_result = calculate_cascade_risks(cascade_input)
    
    # 3. Decision engine
    decision_result = generate_decision(
        asset_id=data.assetId,
        risk_score=risk_result["score"],
        anomaly_detected=anomaly_result["detected"],
        failure_prob=failure_result["probability"],
        cascade_data=cascade_result
    )
    
    return {
        "assetId": data.assetId,
        "telemetry": data_dict,
        "anomaly": anomaly_result,
        "failurePrediction": failure_result,
        "risk": risk_result,
        "cascade": cascade_result,
        "decision": decision_result
    }

@router.post("/ai-analysis", response_model=AIAnalysisResponse)
def api_ai_analysis(data: AIAnalysisRequest):
    ai_result = generate_ai_analysis(data.dict())
    return {
        "assetId": data.assetId,
        "analysis": ai_result.get("analysis", ""),
        "possibleCauses": ai_result.get("possibleCauses", []),
        "recommendation": ai_result.get("recommendation", "")
    }
