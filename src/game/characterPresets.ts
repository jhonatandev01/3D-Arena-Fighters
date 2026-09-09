import { CharacterPreset } from '../types';

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'cyber_samurai',
    name: 'Ronin Zero',
    title: 'Cyber Samurai',
    description: 'Espadachim cibernético de alta precisão com lâmina de plasma e esquiva ágil.',
    color: '#06b6d4', // cyan-500
    secondaryColor: '#3b82f6',
    stats: {
      hp: 100,
      attack: 24,
      defense: 12,
      speed: 12,
      energyRegen: 15,
    },
    weaponName: 'Lâmina de Plasma Muramasa',
    specialName: 'Lâmina do Dragão',
    specialDescription: 'Desfere um corte flamejante de energia que atravessa e causa dano massivo em linha reta.',
    quote: 'Minha lâmina corta o silêncio da rede.',
  },
  {
    id: 'mecha_titan',
    name: 'Goliath MK-IV',
    title: 'Blindado Mecha',
    description: 'Colosso blindado com escudo defletor de alta densidade e canhões de impacto sísmico.',
    color: '#f59e0b', // amber-500
    secondaryColor: '#ef4444',
    stats: {
      hp: 140,
      attack: 20,
      defense: 25,
      speed: 8.5,
      energyRegen: 10,
    },
    weaponName: 'Punhos Sísmicos Gravitacionais',
    specialName: 'Impacto Orbital',
    specialDescription: 'Salta e colide contra o solo criando uma onda de choque sísmica devastadora em 360°.',
    quote: 'Blindagem impenetrável. Força inabalável.',
  },
  {
    id: 'neon_valkyrie',
    name: 'Aria Lumina',
    title: 'Guerreira Estelar',
    description: 'Combatente alada canalizadora de energia de fótons com lança e orbes de luz concentrada.',
    color: '#ec4899', // pink-500
    secondaryColor: '#8b5cf6',
    stats: {
      hp: 95,
      attack: 26,
      defense: 10,
      speed: 13,
      energyRegen: 20,
    },
    weaponName: 'Lança de Fótons Radiante',
    specialName: 'Chuva Cósmica',
    specialDescription: 'Canaliza uma barragem de projéteis de energia guiados que perseguem o oponente.',
    quote: 'A luz dissipa as trevas da arena.',
  },
  {
    id: 'shadow_assassin',
    name: 'Kage Vex',
    title: 'Espectro Noturno',
    description: 'Assassino sombrio que utiliza adagas de vácuo, furtividade instantânea e cortes duplos velozes.',
    color: '#10b981', // emerald-500
    secondaryColor: '#059669',
    stats: {
      hp: 90,
      attack: 28,
      defense: 8,
      speed: 14,
      energyRegen: 18,
    },
    weaponName: 'Adagas Espectrais do Vácuo',
    specialName: 'Distorção Fantasma',
    specialDescription: 'Teleporta rapidamente num rasgo dimensional atacando pelas costas com dano crítico.',
    quote: 'Você não pode golpear o que não consegue ver.',
  },
  {
    id: 'custom_glb',
    name: 'Personagem GLB Personalizado',
    title: 'Modelo 3D Externo',
    description: 'Faça upload de qualquer arquivo .glb / .gltf ou insira uma URL de modelo 3D para lutar na arena!',
    color: '#8b5cf6', // purple-500
    secondaryColor: '#ec4899',
    stats: {
      hp: 110,
      attack: 25,
      defense: 15,
      speed: 11,
      energyRegen: 15,
    },
    weaponName: 'Armamento Personalizável',
    specialName: 'Pulso de Energia Quântica',
    specialDescription: 'Sobrecarga de energia cinética ao redor do modelo causando dano de repulsão.',
    quote: 'Meu guerreiro, minhas regras.',
  },
];
