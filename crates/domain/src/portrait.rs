use serde::{Deserialize, Serialize};

pub const PORTRAIT_RENDERER_VERSION: u16 = 2;

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PortraitFeatureLocks {
    #[serde(default)]
    pub face: bool,
    #[serde(default)]
    pub hair: bool,
    #[serde(default)]
    pub clothing: bool,
    #[serde(default)]
    pub accessories: bool,
    #[serde(default)]
    pub background: bool,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PortraitRecipe {
    #[serde(default)]
    pub seed: u64,
    #[serde(default = "default_renderer_version")]
    pub renderer_version: u16,
    #[serde(default = "default_presentation")]
    pub presentation: String,
    #[serde(default = "default_age_band")]
    pub age_band: String,
    pub skin_tone: u8,
    pub face_shape: String,
    #[serde(default = "default_face_width")]
    pub face_width: u8,
    #[serde(default = "default_jaw")]
    pub jaw: String,
    #[serde(default = "default_chin")]
    pub chin: String,
    #[serde(default = "default_eye_shape")]
    pub eye_shape: String,
    #[serde(default = "default_eye_color")]
    pub eye_color: String,
    #[serde(default = "default_eyebrows")]
    pub eyebrow_style: String,
    #[serde(default = "default_nose")]
    pub nose_style: String,
    #[serde(default = "default_mouth")]
    pub mouth_style: String,
    #[serde(default = "default_ears")]
    pub ear_style: String,
    pub hair_style: String,
    pub hair_color: String,
    pub facial_hair: String,
    #[serde(default = "default_moustache")]
    pub moustache: String,
    #[serde(default = "default_hair_color")]
    pub body_hair_color: String,
    #[serde(default)]
    pub wrinkles: u8,
    #[serde(default = "default_marks")]
    pub marks: String,
    pub glasses: bool,
    #[serde(default)]
    pub accessories: Vec<String>,
    pub clothing: String,
    #[serde(default = "default_clothing_color")]
    pub clothing_color: String,
    #[serde(default = "default_background")]
    pub background: String,
    #[serde(default = "default_lighting")]
    pub lighting: String,
    #[serde(default = "default_preset")]
    pub preset: String,
    #[serde(default)]
    pub locks: PortraitFeatureLocks,
}

impl PortraitRecipe {
    pub fn validate(&self) -> Result<(), String> {
        if self.renderer_version == 0 || self.renderer_version > PORTRAIT_RENDERER_VERSION {
            return Err("versão do renderer de retrato não suportada".to_owned());
        }
        if self.skin_tone > 11 || self.face_width > 100 || self.wrinkles > 100 {
            return Err("receita de retrato fora dos limites suportados".to_owned());
        }
        for value in [
            &self.presentation,
            &self.age_band,
            &self.face_shape,
            &self.jaw,
            &self.chin,
            &self.eye_shape,
            &self.eye_color,
            &self.eyebrow_style,
            &self.nose_style,
            &self.mouth_style,
            &self.ear_style,
            &self.hair_style,
            &self.hair_color,
            &self.facial_hair,
            &self.moustache,
            &self.body_hair_color,
            &self.marks,
            &self.clothing,
            &self.clothing_color,
            &self.background,
            &self.lighting,
            &self.preset,
        ] {
            if value.is_empty() || value.len() > 80 || value.chars().any(char::is_control) {
                return Err("receita de retrato contém opção inválida".to_owned());
            }
        }
        if self.accessories.len() > 4
            || self.accessories.iter().any(|value| {
                value.is_empty() || value.len() > 80 || value.chars().any(char::is_control)
            })
        {
            return Err("acessórios do retrato são inválidos".to_owned());
        }
        Ok(())
    }
}

impl Default for PortraitRecipe {
    fn default() -> Self {
        Self {
            seed: 1,
            renderer_version: PORTRAIT_RENDERER_VERSION,
            presentation: default_presentation(),
            age_band: default_age_band(),
            skin_tone: 4,
            face_shape: "oval".to_owned(),
            face_width: default_face_width(),
            jaw: default_jaw(),
            chin: default_chin(),
            eye_shape: default_eye_shape(),
            eye_color: default_eye_color(),
            eyebrow_style: default_eyebrows(),
            nose_style: default_nose(),
            mouth_style: default_mouth(),
            ear_style: default_ears(),
            hair_style: "curto".to_owned(),
            hair_color: default_hair_color(),
            facial_hair: "nenhuma".to_owned(),
            moustache: default_moustache(),
            body_hair_color: default_hair_color(),
            wrinkles: 8,
            marks: default_marks(),
            glasses: false,
            accessories: Vec::new(),
            clothing: "social escuro".to_owned(),
            clothing_color: default_clothing_color(),
            background: default_background(),
            lighting: default_lighting(),
            preset: default_preset(),
            locks: PortraitFeatureLocks::default(),
        }
    }
}

const fn default_renderer_version() -> u16 {
    PORTRAIT_RENDERER_VERSION
}

fn default_presentation() -> String {
    "busto".to_owned()
}
fn default_age_band() -> String {
    "adulto".to_owned()
}
const fn default_face_width() -> u8 {
    50
}
fn default_jaw() -> String {
    "suave".to_owned()
}
fn default_chin() -> String {
    "médio".to_owned()
}
fn default_eye_shape() -> String {
    "amendoado".to_owned()
}
fn default_eye_color() -> String {
    "castanho".to_owned()
}
fn default_eyebrows() -> String {
    "natural".to_owned()
}
fn default_nose() -> String {
    "reto".to_owned()
}
fn default_mouth() -> String {
    "neutra".to_owned()
}
fn default_ears() -> String {
    "médias".to_owned()
}
fn default_moustache() -> String {
    "nenhum".to_owned()
}
fn default_hair_color() -> String {
    "castanho".to_owned()
}
fn default_marks() -> String {
    "nenhuma".to_owned()
}
fn default_clothing_color() -> String {
    "grafite".to_owned()
}
fn default_background() -> String {
    "refletores".to_owned()
}
fn default_lighting() -> String {
    "lateral suave".to_owned()
}
fn default_preset() -> String {
    "moderno".to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn portrait_recipe_round_trips_and_rejects_future_renderers() {
        let recipe = PortraitRecipe::default();
        let encoded = serde_json::to_string(&recipe).expect("serialize recipe");
        assert_eq!(
            serde_json::from_str::<PortraitRecipe>(&encoded).unwrap(),
            recipe
        );

        let mut future = recipe;
        future.renderer_version = PORTRAIT_RENDERER_VERSION + 1;
        assert!(future.validate().is_err());
    }
}
