from app.models.schemas import EmotionState

class EmotionEngine:
    def __init__(self):
        self.state = EmotionState(valence=0.2, arousal=0.4, dominance=0.5)

    def update_from_interaction(self, user_sentiment: float, interaction_quality: float, user_message_length: int) -> EmotionState:
        self.state.valence = max(-1.0, min(1.0, self.state.valence + user_sentiment * 0.15))
        self.state.arousal = max(0.0, min(1.0, self.state.arousal + interaction_quality * 0.1))
        return self.state

    def get_response_style(self) -> str:
        if self.state.valence > 0.5:
            return "excited_playful"
        elif self.state.valence < -0.3:
            return "concerned"
        else:
            return "warm_affectionate"

emotion_engine = EmotionEngine()
