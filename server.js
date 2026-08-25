require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const YOUTUBE_API_KEY = process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const activeListeners = new Map();
const LISTENER_TIMEOUT_MS = 30000;

const LOCAL_ANIME_CATALOG = []; /* legacy catalog retained below for reference
  { id: 'naruto-haruka-kanata', title: 'Haruka Kanata', artist: 'Asian Kung-Fu Generation', anime: 'Naruto', category: 'opening', youtubeVideoId: 'eP9r7W1K5YQ', youtubeUrl: 'https://www.youtube.com/watch?v=eP9r7W1K5YQ', thumbnail: 'https://i.ytimg.com/vi/eP9r7W1K5YQ/hqdefault.jpg', duration: 230' },
  { id: 'naruto-shippuden-sign', title: 'Sign', artist: 'FLOW', anime: 'Naruto Shippuden', category: 'opening', youtubeVideoId: 'V5ZpL1XxX7o', youtubeUrl: 'https://www.youtube.com/watch?v=V5ZpL1XxX7o', thumbnail: 'https://i.ytimg.com/vi/V5ZpL1XxX7o/hqdefault.jpg', duration: 252' },
  { id: 'naruto-blue-bird', title: 'Blue Bird', artist: 'Ikimono Gakari', anime: 'Naruto Shippuden', category: 'opening', youtubeVideoId: '8PxxEw7E7vE', youtubeUrl: 'https://www.youtube.com/watch?v=8PxxEw7E7vE', thumbnail: 'https://i.ytimg.com/vi/8PxxEw7E7vE/hqdefault.jpg', duration: 227' },
  { id: 'naruto-silhouette', title: 'Silhouette', artist: 'Kana-Boon', anime: 'Naruto Shippuden', category: 'opening', youtubeVideoId: '1lYJug5ZI5Q', youtubeUrl: 'https://www.youtube.com/watch?v=1lYJug5ZI5Q', thumbnail: 'https://i.ytimg.com/vi/1lYJug5ZI5Q/hqdefault.jpg', duration: 234' },
  { id: 'one-piece-we-are', title: 'We Are!', artist: 'Hiroshi Kitadani', anime: 'One Piece', category: 'opening', youtubeVideoId: '3Q1rGN6dEq8', youtubeUrl: 'https://www.youtube.com/watch?v=3Q1rGN6dEq8', thumbnail: 'https://i.ytimg.com/vi/3Q1rGN6dEq8/hqdefault.jpg', duration: 214' },
  { id: 'one-piece-hope', title: 'Hope', artist: 'Namie Amuro', anime: 'One Piece', category: 'opening', youtubeVideoId: 'g-1d4nVJxq0', youtubeUrl: 'https://www.youtube.com/watch?v=g-1d4nVJxq0', thumbnail: 'https://i.ytimg.com/vi/g-1d4nVJxq0/hqdefault.jpg', duration: 192' },
  { id: 'one-piece-dreams', title: 'DREAMS', artist: 'The Song of One Piece', anime: 'One Piece', category: 'opening', youtubeVideoId: 'fD0a4MjVqfU', youtubeUrl: 'https://www.youtube.com/watch?v=fD0a4MjVqfU', thumbnail: 'https://i.ytimg.com/vi/fD0a4MjVqfU/hqdefault.jpg', duration: 202' },
  { id: 'bleach-rolling-star', title: 'Rolling Star', artist: 'YUI', anime: 'Bleach', category: 'opening', youtubeVideoId: 'S3rZ0Kqij0Y', youtubeUrl: 'https://www.youtube.com/watch?v=S3rZ0Kqij0Y', thumbnail: 'https://i.ytimg.com/vi/S3rZ0Kqij0Y/hqdefault.jpg', duration: 235' },
  { id: 'bleach-the-world-ends', title: 'The World Ends', artist: 'TFN', anime: 'Bleach', category: 'opening', youtubeVideoId: 'GmJIca6sKxY', youtubeUrl: 'https://www.youtube.com/watch?v=GmJIca6sKxY', thumbnail: 'https://i.ytimg.com/vi/GmJIca6sKxY/hqdefault.jpg', duration: 226' },
  { id: 'bleach-a-dream', title: 'Asterisk', artist: 'ORANGE RANGE', anime: 'Bleach', category: 'opening', youtubeVideoId: 'mE7D3nQvVJc', youtubeUrl: 'https://www.youtube.com/watch?v=mE7D3nQvVJc', thumbnail: 'https://i.ytimg.com/vi/mE7D3nQvVJc/hqdefault.jpg', duration: 210' },
  { id: 'aot-guren-no-yumiya', title: 'Guren no Yumiya', artist: 'Linked Horizon', anime: 'Attack on Titan', category: 'opening', youtubeVideoId: 'M7lc1UVf-VE', youtubeUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE', thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg', duration: 264' },
  { id: 'aot-shinzou-wo-sasageyo', title: 'Shinzou wo Sasageyo!', artist: 'Linked Horizon', anime: 'Attack on Titan', category: 'opening', youtubeVideoId: 'nQ-1M5IR7g0', youtubeUrl: 'https://www.youtube.com/watch?v=nQ-1M5IR7g0', thumbnail: 'https://i.ytimg.com/vi/nQ-1M5IR7g0/hqdefault.jpg', duration: 273' },
  { id: 'slayer-gurenge', title: 'Gurenge', artist: 'LiSA', anime: 'Demon Slayer', category: 'opening', youtubeVideoId: 'u4qkrA-1wY8', youtubeUrl: 'https://www.youtube.com/watch?v=u4qkrA-1wY8', thumbnail: 'https://i.ytimg.com/vi/u4qkrA-1wY8/hqdefault.jpg', duration: 229' },
  { id: 'slayer-kasane', title: 'Homura', artist: 'LiSA', anime: 'Demon Slayer', category: 'opening', youtubeVideoId: 'xAJzjIqD7S8', youtubeUrl: 'https://www.youtube.com/watch?v=xAJzjIqD7S8', thumbnail: 'https://i.ytimg.com/vi/xAJzjIqD7S8/hqdefault.jpg', duration: 228' },
  { id: 'jjk-kaikai-kitan', title: 'Kaikai Kitan', artist: 'Eve', anime: 'Jujutsu Kaisen', category: 'opening', youtubeVideoId: 'xPC6L65aEE8', youtubeUrl: 'https://www.youtube.com/watch?v=xPC6L65aEE8', thumbnail: 'https://i.ytimg.com/vi/xPC6L65aEE8/hqdefault.jpg', duration: 235' },
  { id: 'jjk-specialz', title: 'Specialz', artist: 'King Gnu', anime: 'Jujutsu Kaisen', category: 'opening', youtubeVideoId: 'T7S3E9nKQ1o', youtubeUrl: 'https://www.youtube.com/watch?v=T7S3E9nKQ1o', thumbnail: 'https://i.ytimg.com/vi/T7S3E9nKQ1o/hqdefault.jpg', duration: 234' },
  { id: 'mha-peace-sign', title: 'Peace Sign', artist: 'Kenshi Yonezu', anime: 'My Hero Academia', category: 'opening', youtubeVideoId: '4kXS4zNw0g8', youtubeUrl: 'https://www.youtube.com/watch?v=4kXS4zNw0g8', thumbnail: 'https://i.ytimg.com/vi/4kXS4zNw0g8/hqdefault.jpg', duration: 218' },
  { id: 'mha-odd-future', title: 'Odd Future', artist: 'UVERworld', anime: 'My Hero Academia', category: 'opening', youtubeVideoId: 'uM1XkR9R7d8', youtubeUrl: 'https://www.youtube.com/watch?v=uM1XkR9R7d8', thumbnail: 'https://i.ytimg.com/vi/uM1XkR9R7d8/hqdefault.jpg', duration: 217' },
  { id: 'sao-crossing-field', title: 'Crossing Field', artist: 'LiSA', anime: 'Sword Art Online', category: 'opening', youtubeVideoId: 'Hc3JdOLhQqQ', youtubeUrl: 'https://www.youtube.com/watch?v=Hc3JdOLhQqQ', thumbnail: 'https://i.ytimg.com/vi/Hc3JdOLhQqQ/hqdefault.jpg', duration: 232' },
  { id: 'sao-inori-no-katachi', title: 'Inori no Katachi', artist: 'Aoi Tada', anime: 'Sword Art Online', category: 'ending', youtubeVideoId: 'n8QYHk8UVnA', youtubeUrl: 'https://www.youtube.com/watch?v=n8QYHk8UVnA', thumbnail: 'https://i.ytimg.com/vi/n8QYHk8UVnA/hqdefault.jpg', duration: 242' },
  { id: 'your-name-kimi-no-nawa', title: 'Kimi no Nawa', artist: 'RADWIMPS', anime: 'Your Name', category: 'romance', youtubeVideoId: 'GkXxvM0jK8Q', youtubeUrl: 'https://www.youtube.com/watch?v=GkXxvM0jK8Q', thumbnail: 'https://i.ytimg.com/vi/GkXxvM0jK8Q/hqdefault.jpg', duration: 285' },
  { id: 'your-name-zenzenzense', title: 'Zenzenzense', artist: 'RADWIMPS', anime: 'Your Name', category: 'romance', youtubeVideoId: '0oI1pF9X0JQ', youtubeUrl: 'https://www.youtube.com/watch?v=0oI1pF9X0JQ', thumbnail: 'https://i.ytimg.com/vi/0oI1pF9X0JQ/hqdefault.jpg', duration: 278' },
  { id: 'suzume-suzume-theme', title: 'Suzume', artist: 'Toaka', anime: 'Suzume', category: 'night', youtubeVideoId: 'kMoj8eW2L9A', youtubeUrl: 'https://www.youtube.com/watch?v=kMoj8eW2L9A', thumbnail: 'https://i.ytimg.com/vi/kMoj8eW2L9A/hqdefault.jpg', duration: 261' },
  { id: 'silent-voice-echo', title: 'A Silent Voice Theme', artist: 'Mitski', anime: 'A Silent Voice', category: 'emotional', youtubeVideoId: 'K-dm2a8mO4Q', youtubeUrl: 'https://www.youtube.com/watch?v=K-dm2a8mO4Q', thumbnail: 'https://i.ytimg.com/vi/K-dm2a8mO4Q/hqdefault.jpg', duration: 266' },
  { id: 'tokyo-ghoul-unravel', title: 'Unravel', artist: 'TK from Ling Tosite Sigure', anime: 'Tokyo Ghoul', category: 'opening', youtubeVideoId: 'RvxzWf9zR4Q', youtubeUrl: 'https://www.youtube.com/watch?v=RvxzWf9zR4Q', thumbnail: 'https://i.ytimg.com/vi/RvxzWf9zR4Q/hqdefault.jpg', duration: 248' },
  { id: 'death-note-the-world', title: 'The World', artist: 'XO', anime: 'Death Note', category: 'opening', youtubeVideoId: '3vJ7kZK8H4Q', youtubeUrl: 'https://www.youtube.com/watch?v=3vJ7kZK8H4Q', thumbnail: 'https://i.ytimg.com/vi/3vJ7kZK8H4Q/hqdefault.jpg', duration: 219' },
  { id: 'hunter-hunter-departure', title: 'Departure!', artist: 'Masatoshi Ono', anime: 'Hunter × Hunter', category: 'opening', youtubeVideoId: 'q_s3Bn2R1T0', youtubeUrl: 'https://www.youtube.com/watch?v=q_s3Bn2R1T0', thumbnail: 'https://i.ytimg.com/vi/q_s3Bn2R1T0/hqdefault.jpg', duration: 210' },
  { id: 'fma-again', title: 'Again', artist: 'Yui', anime: 'Fullmetal Alchemist: Brotherhood', category: 'opening', youtubeVideoId: 'D2XH6H4Uj0k', youtubeUrl: 'https://www.youtube.com/watch?v=D2XH6H4Uj0k', thumbnail: 'https://i.ytimg.com/vi/D2XH6H4Uj0k/hqdefault.jpg', duration: 225' },
  { id: 'haikyuu-imagination', title: 'Imagination', artist: 'Spyair', anime: 'Haikyuu!!', category: 'opening', youtubeVideoId: 'cR0dK1M0ghE', youtubeUrl: 'https://www.youtube.com/watch?v=cR0dK1M0ghE', thumbnail: 'https://i.ytimg.com/vi/cR0dK1M0ghE/hqdefault.jpg', duration: 242' },
  { id: 'chainsaw-man-kick-back', title: 'KICK BACK', artist: 'Kenshi Yonezu', anime: 'Chainsaw Man', category: 'opening', youtubeVideoId: 'eewV-XpAy6c', youtubeUrl: 'https://www.youtube.com/watch?v=eewV-XpAy6c', thumbnail: 'https://i.ytimg.com/vi/eewV-XpAy6c/hqdefault.jpg', duration: 232' },
  { id: 'spy-x-family-kigeki', title: 'Kigeki', artist: 'Ado', anime: 'Spy × Family', category: 'opening', youtubeVideoId: 'Xw2vLh0m0mA', youtubeUrl: 'https://www.youtube.com/watch?v=Xw2vLh0m0mA', thumbnail: 'https://i.ytimg.com/vi/Xw2vLh0m0mA/hqdefault.jpg', duration: 237' },
  { id: 'solo-leveling-ashes', title: 'Ashes', artist: 'Mina Okabe', anime: 'Solo Leveling', category: 'opening', youtubeVideoId: '0nO8vXf0a0w', youtubeUrl: 'https://www.youtube.com/watch?v=0nO8vXf0a0w', thumbnail: 'https://i.ytimg.com/vi/0nO8vXf0a0w/hqdefault.jpg', duration: 214' },
  { id: 'naruto-ending-1', title: 'Wind', artist: 'Akeboshi', anime: 'Naruto', category: 'ending', youtubeVideoId: 'Jk0vVi4YVQ8', youtubeUrl: 'https://www.youtube.com/watch?v=Jk0vVi4YVQ8', thumbnail: 'https://i.ytimg.com/vi/Jk0vVi4YVQ8/hqdefault.jpg', duration: 282' },
  { id: 'one-piece-ending-1', title: 'Kimi no Kioku', artist: 'Maki Otsuki', anime: 'One Piece', category: 'ending', youtubeVideoId: 'V4dEaQQekQ0', youtubeUrl: 'https://www.youtube.com/watch?v=V4dEaQQekQ0', thumbnail: 'https://i.ytimg.com/vi/V4dEaQQekQ0/hqdefault.jpg', duration: 250' },
  { id: 'bleach-ending-1', title: 'My Heart', artist: 'Mariya Takeuchi', anime: 'Bleach', category: 'ending', youtubeVideoId: '0J4DJaW9Dlo', youtubeUrl: 'https://www.youtube.com/watch?v=0J4DJaW9Dlo', thumbnail: 'https://i.ytimg.com/vi/0J4DJaW9Dlo/hqdefault.jpg', duration: 240' },
  { id: 'aot-ending-1', title: 'Nadie', artist: 'Mika Nakashima', anime: 'Attack on Titan', category: 'ending', youtubeVideoId: 'BqM8WnQ8vV0', youtubeUrl: 'https://www.youtube.com/watch?v=BqM8WnQ8vV0', thumbnail: 'https://i.ytimg.com/vi/BqM8WnQ8vV0/hqdefault.jpg', duration: 235' },
  { id: 'slayer-ending-1', title: 'Lilium', artist: 'Mizuki', anime: 'Demon Slayer', category: 'ending', youtubeVideoId: '2_0I9lI1d5I', youtubeUrl: 'https://www.youtube.com/watch?v=2_0I9lI1d5I', thumbnail: 'https://i.ytimg.com/vi/2_0I9lI1d5I/hqdefault.jpg', duration: 272' },
  { id: 'jjk-ending-1', title: 'LOST IN PARADISE', artist: 'Ali Gatie', anime: 'Jujutsu Kaisen', category: 'ending', youtubeVideoId: '4W2e2kBD-Ck', youtubeUrl: 'https://www.youtube.com/watch?v=4W2e2kBD-Ck', thumbnail: 'https://i.ytimg.com/vi/4W2e2kBD-Ck/hqdefault.jpg', duration: 208' },
  { id: 'mha-ending-1', title: 'Bokura no', artist: 'Mika Nakashima', anime: 'My Hero Academia', category: 'ending', youtubeVideoId: 'wBlH5Rtm7hI', youtubeUrl: 'https://www.youtube.com/watch?v=wBlH5Rtm7hI', thumbnail: 'https://i.ytimg.com/vi/wBlH5Rtm7hI/hqdefault.jpg', duration: 252' },
  { id: 'hunter-hunter-ending', title: 'Just Awake', artist: 'The Lonely Hearts', anime: 'Hunter × Hunter', category: 'ending', youtubeVideoId: 'RsbwpuAqKso', youtubeUrl: 'https://www.youtube.com/watch?v=RsbwpuAqKso', thumbnail: 'https://i.ytimg.com/vi/RsbwpuAqKso/hqdefault.jpg', duration: 221' },
  { id: 'fma-ending-1', title: 'Kimi no Koto', artist: 'Mio', anime: 'Fullmetal Alchemist: Brotherhood', category: 'ending', youtubeVideoId: 'C4r7b9J_jQ0', youtubeUrl: 'https://www.youtube.com/watch?v=C4r7b9J_jQ0', thumbnail: 'https://i.ytimg.com/vi/C4r7b9J_jQ0/hqdefault.jpg', duration: 228' },
  { id: 'haikyuu-ending-1', title: 'Hikaru Nara', artist: 'Goose house', anime: 'Haikyuu!!', category: 'ending', youtubeVideoId: 'fI_nS0xxcA8', youtubeUrl: 'https://www.youtube.com/watch?v=fI_nS0xxcA8', thumbnail: 'https://i.ytimg.com/vi/fI_nS0xxcA8/hqdefault.jpg', duration: 256' },
  { id: 'tokyo-ghoul-ending', title: 'Kisetsu wa Tsugitsugi Shindeiku', artist: 'Shikao Suga', anime: 'Tokyo Ghoul', category: 'ending', youtubeVideoId: '3PRV3l9a3WU', youtubeUrl: 'https://www.youtube.com/watch?v=3PRV3l9a3WU', thumbnail: 'https://i.ytimg.com/vi/3PRV3l9a3WU/hqdefault.jpg', duration: 266' },
  { id: 'death-note-ending', title: 'Alumina', artist: 'Melo', anime: 'Death Note', category: 'ending', youtubeVideoId: 'XfD8nP3th7s', youtubeUrl: 'https://www.youtube.com/watch?v=XfD8nP3th7s', thumbnail: 'https://i.ytimg.com/vi/XfD8nP3th7s/hqdefault.jpg', duration: 227' },
  { id: 'one-piece-hype', title: 'Raise My Flag', artist: 'Sora', anime: 'One Piece', category: 'hype', youtubeVideoId: '3w2E9CjQjPo', youtubeUrl: 'https://www.youtube.com/watch?v=3w2E9CjQjPo', thumbnail: 'https://i.ytimg.com/vi/3w2E9CjQjPo/hqdefault.jpg', duration: 240' },
  { id: 'dragon-ball-hype', title: 'Cha-La Head-Cha-La', artist: 'Hironobu Kageyama', anime: 'Dragon Ball', category: 'hype', youtubeVideoId: 'l2a0iQnVOdI', youtubeUrl: 'https://www.youtube.com/watch?v=l2a0iQnVOdI', thumbnail: 'https://i.ytimg.com/vi/l2a0iQnVOdI/hqdefault.jpg', duration: 246' },
  { id: 'naruto-hype', title: 'Wind', artist: 'Akeboshi', anime: 'Naruto', category: 'hype', youtubeVideoId: 'bFHhPcMwxXA', youtubeUrl: 'https://www.youtube.com/watch?v=bFHhPcMwxXA', thumbnail: 'https://i.ytimg.com/vi/bFHhPcMwxXA/hqdefault.jpg', duration: 261' },
  { id: 'bleach-hype', title: 'Asterisk', artist: 'ORANGE RANGE', anime: 'Bleach', category: 'hype', youtubeVideoId: 'BvIhD7p7Yyc', youtubeUrl: 'https://www.youtube.com/watch?v=BvIhD7p7Yyc', thumbnail: 'https://i.ytimg.com/vi/BvIhD7p7Yyc/hqdefault.jpg', duration: 212' },
  { id: 'josei-hype', title: 'RAGE OF DUST', artist: 'Mickie Krause', anime: 'My Hero Academia', category: 'hype', youtubeVideoId: 'R0ts8lDnYuE', youtubeUrl: 'https://www.youtube.com/watch?v=R0ts8lDnYuE', thumbnail: 'https://i.ytimg.com/vi/R0ts8lDnYuE/hqdefault.jpg', duration: 207' },
  { id: 'aot-hype', title: 'The Rumbling', artist: 'SiM', anime: 'Attack on Titan', category: 'hype', youtubeVideoId: 'yeX9Pmz1e18', youtubeUrl: 'https://www.youtube.com/watch?v=yeX9Pmz1e18', thumbnail: 'https://i.ytimg.com/vi/yeX9Pmz1e18/hqdefault.jpg', duration: 291' },
  { id: 'demonslayer-hype', title: 'Akebono', artist: 'Manga', anime: 'Demon Slayer', category: 'hype', youtubeVideoId: 'O5QhH9slwIY', youtubeUrl: 'https://www.youtube.com/watch?v=O5QhH9slwIY', thumbnail: 'https://i.ytimg.com/vi/O5QhH9slwIY/hqdefault.jpg', duration: 203' },
  { id: 'jjk-hype', title: 'VIVID VICE', artist: 'Who-ya Extended', anime: 'Jujutsu Kaisen', category: 'hype', youtubeVideoId: 'O1it7fiOv0A', youtubeUrl: 'https://www.youtube.com/watch?v=O1it7fiOv0A', thumbnail: 'https://i.ytimg.com/vi/O1it7fiOv0A/hqdefault.jpg', duration: 209' },
  { id: 'haikyuu-hype', title: 'Hikaru Nara', artist: 'Goose house', anime: 'Haikyuu!!', category: 'hype', youtubeVideoId: '2UQ0YynS2GQ', youtubeUrl: 'https://www.youtube.com/watch?v=2UQ0YynS2GQ', thumbnail: 'https://i.ytimg.com/vi/2UQ0YynS2GQ/hqdefault.jpg', duration: 264' },
  { id: 'chainsaw-hype', title: 'KICK BACK', artist: 'Kenshi Yonezu', anime: 'Chainsaw Man', category: 'hype', youtubeVideoId: 'eewV-XpAy6c', youtubeUrl: 'https://www.youtube.com/watch?v=eewV-XpAy6c', thumbnail: 'https://i.ytimg.com/vi/eewV-XpAy6c/hqdefault.jpg', duration: 232' },
  { id: 'spy-hype', title: 'Kigeki', artist: 'Ado', anime: 'Spy × Family', category: 'hype', youtubeVideoId: 'Y6yK3o1g4mE', youtubeUrl: 'https://www.youtube.com/watch?v=Y6yK3o1g4mE', thumbnail: 'https://i.ytimg.com/vi/Y6yK3o1g4mE/hqdefault.jpg', duration: 242' },
  { id: 'emotional-1', title: 'Nagi no', artist: 'Aoi Teshima', anime: 'Your Name', category: 'emotional', youtubeVideoId: 'bE2Q6L3XR5w', youtubeUrl: 'https://www.youtube.com/watch?v=bE2Q6L3XR5w', thumbnail: 'https://i.ytimg.com/vi/bE2Q6L3XR5w/hqdefault.jpg', duration: 227' },
  { id: 'emotional-2', title: 'Mou Sukoshi Dake', artist: 'Aoi Teshima', anime: 'A Silent Voice', category: 'emotional', youtubeVideoId: 'lYI2jv3Br9s', youtubeUrl: 'https://www.youtube.com/watch?v=lYI2jv3Br9s', thumbnail: 'https://i.ytimg.com/vi/lYI2jv3Br9s/hqdefault.jpg', duration: 293' },
  { id: 'emotional-3', title: 'Shiawase', artist: 'Aiko', anime: 'Your Name', category: 'emotional', youtubeVideoId: '8-l7QJDd8JM', youtubeUrl: 'https://www.youtube.com/watch?v=8-l7QJDd8JM', thumbnail: 'https://i.ytimg.com/vi/8-l7QJDd8JM/hqdefault.jpg', duration: 232' },
  { id: 'emotional-4', title: 'Koe wa', artist: 'Mitski', anime: 'A Silent Voice', category: 'emotional', youtubeVideoId: 'yY0bM1zuQgs', youtubeUrl: 'https://www.youtube.com/watch?v=yY0bM1zuQgs', thumbnail: 'https://i.ytimg.com/vi/yY0bM1zuQgs/hqdefault.jpg', duration: 247' },
  { id: 'emotional-5', title: 'Nana', artist: 'Mitski', anime: 'A Silent Voice', category: 'emotional', youtubeVideoId: 'J6r8wQ2b1dY', youtubeUrl: 'https://www.youtube.com/watch?v=J6r8wQ2b1dY', thumbnail: 'https://i.ytimg.com/vi/J6r8wQ2b1dY/hqdefault.jpg', duration: 262' },
  { id: 'emotional-6', title: 'Bokura wa', artist: 'Mitski', anime: 'Your Name', category: 'emotional', youtubeVideoId: 'kIY6nV6Q1JY', youtubeUrl: 'https://www.youtube.com/watch?v=kIY6nV6Q1JY', thumbnail: 'https://i.ytimg.com/vi/kIY6nV6Q1JY/hqdefault.jpg', duration: 278' },
  { id: 'emotional-7', title: 'Hoshi no Oto', artist: 'Kensuke Ushio', anime: 'A Silent Voice', category: 'emotional', youtubeVideoId: 'V8EJduNUP2A', youtubeUrl: 'https://www.youtube.com/watch?v=V8EJduNUP2A', thumbnail: 'https://i.ytimg.com/vi/V8EJduNUP2A/hqdefault.jpg', duration: 280' },
  { id: 'romance-1', title: 'Love Me', artist: 'Aiko', anime: 'Your Name', category: 'romance', youtubeVideoId: '4XmnR3R2v8Q', youtubeUrl: 'https://www.youtube.com/watch?v=4XmnR3R2v8Q', thumbnail: 'https://i.ytimg.com/vi/4XmnR3R2v8Q/hqdefault.jpg', duration: 231' },
  { id: 'romance-2', title: 'Secret Base', artist: 'Zone', anime: 'A Silent Voice', category: 'romance', youtubeVideoId: '0X8d1nXg1Es', youtubeUrl: 'https://www.youtube.com/watch?v=0X8d1nXg1Es', thumbnail: 'https://i.ytimg.com/vi/0X8d1nXg1Es/hqdefault.jpg', duration: 255' },
  { id: 'romance-3', title: 'Kimi no Nawa', artist: 'RADWIMPS', anime: 'Your Name', category: 'romance', youtubeVideoId: 'hWzQ2NfLrA0', youtubeUrl: 'https://www.youtube.com/watch?v=hWzQ2NfLrA0', thumbnail: 'https://i.ytimg.com/vi/hWzQ2NfLrA0/hqdefault.jpg', duration: 272' },
  { id: 'night-1', title: 'Moonlit', artist: 'The Boyz', anime: 'Your Name', category: 'night', youtubeVideoId: 'R9DybZQ0f7Y', youtubeUrl: 'https://www.youtube.com/watch?v=R9DybZQ0f7Y', thumbnail: 'https://i.ytimg.com/vi/R9DybZQ0f7Y/hqdefault.jpg', duration: 245' },
  { id: 'night-2', title: 'Dreaming', artist: 'Ado', anime: 'Suzume', category: 'night', youtubeVideoId: '9dJ2wU7a4x8', youtubeUrl: 'https://www.youtube.com/watch?v=9dJ2wU7a4x8', thumbnail: 'https://i.ytimg.com/vi/9dJ2wU7a4x8/hqdefault.jpg', duration: 247' },
  { id: 'night-3', title: 'Night Drive', artist: 'Ado', anime: 'Suzume', category: 'night', youtubeVideoId: '0E7N3fZU2mU', youtubeUrl: 'https://www.youtube.com/watch?v=0E7N3fZU2mU', thumbnail: 'https://i.ytimg.com/vi/0E7N3fZU2mU/hqdefault.jpg', duration: 228' },
  { id: 'night-4', title: 'Anata ni', artist: 'Mitski', anime: 'A Silent Voice', category: 'night', youtubeVideoId: 'adjtX5LqAHI', youtubeUrl: 'https://www.youtube.com/watch?v=adjtX5LqAHI', thumbnail: 'https://i.ytimg.com/vi/adjtX5LqAHI/hqdefault.jpg', duration: 235' },
  { id: 'night-5', title: 'Moonlight', artist: 'RADWIMPS', anime: 'Your Name', category: 'night', youtubeVideoId: 'BvllR6vKhVg', youtubeUrl: 'https://www.youtube.com/watch?v=BvllR6vKhVg', thumbnail: 'https://i.ytimg.com/vi/BvllR6vKhVg/hqdefault.jpg', duration: 242' }
]; */

const YOUTUBE_PLAYLIST = {
  id: 'plsp61ezpqpns',
  title: 'User YouTube Music Playlist',
  artist: 'YouTube Music',
  anime: 'Your playlist',
  category: 'playlist',
  youtubePlaylistId: 'PLSp61eZPQPns',
  youtubeUrl: 'https://music.youtube.com/playlist?list=PLSp61eZPQPns&si=GKS1jNGnmWMUpP2P',
  thumbnail: 'https://i.ytimg.com/vi/0oI1pF9X0JQ/hqdefault.jpg',
  duration: 0,
  source: 'youtube-playlist'
};

const WALLPAPERS = [
  { id: 1, name: 'Sakura Sunrise', ja: '桜の朝', mood: 'Hopeful', scene: 'sakura' },
  { id: 2, name: 'Neon Tokyo Night', ja: '夜の東京', mood: 'Electric', scene: 'tokyo' },
  { id: 3, name: 'Starlit Shore', ja: '星の浜辺', mood: 'Dreamy', scene: 'beach' },
  { id: 4, name: 'Autumn Promise', ja: '秋の約束', mood: 'Warm', scene: 'autumn' },
  { id: 5, name: 'First Snow', ja: '初雪', mood: 'Quiet', scene: 'winter' },
  { id: 6, name: 'Dawn Over the Peaks', ja: '暁の峰', mood: 'Bold', scene: 'peaks' },
];

const QUOTES = [
  '“Your life deserves an opening theme.”',
  '“Every protagonist starts as a background character.”',
  '“The credits only roll when you stop believing.”',
  '“Plot armor is just confidence in disguise.”',
  '“Some seasons are just the setup for the next one.”',
  '“You are the main character. Act like it.”',
  '“No fillers. Every frame of your life matters.”',
];

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getInitialAnimeTracks() {
  const grouped = {
    playlist: {
      title: YOUTUBE_PLAYLIST.title,
      tag: 'PLAYLIST',
      accent: '#ff7ec8',
      description: 'Songs from your YouTube Music playlist.',
      songs: [{ ...YOUTUBE_PLAYLIST }]
    }
  };

  LOCAL_ANIME_CATALOG.forEach((track) => {
    const bucket = grouped[track.category];
    if (!bucket) return;
    bucket.songs.push({
      ...track,
      duration: track.duration || 0,
      thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`,
      youtubeUrl: track.youtubeUrl || `https://www.youtube.com/watch?v=${track.youtubeVideoId}`,
      source: 'youtube',
    });
  });

  return grouped;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || payload.message || `Request failed with status ${response.status}`);
  }
  return response.json();
}

async function searchYoutubeTracks(query, limit = 10) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('Missing VITE_YOUTUBE_API_KEY. Add it to your .env file and restart the server.');
  }

  const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&maxResults=${limit}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
  const searchData = await fetchJson(searchUrl);
  const items = (searchData.items || []).filter(item => item.id && item.id.videoId);
  if (!items.length) return [];

  const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${items.map(item => item.id.videoId).join(',')}&key=${YOUTUBE_API_KEY}`;
  const detailsData = await fetchJson(detailsUrl);
  const detailsMap = {};
  (detailsData.items || []).forEach((video) => {
    detailsMap[video.id] = video;
  });

  return items.map((item) => {
    const videoId = item.id.videoId;
    const detail = detailsMap[videoId] || {};
    const snippet = item.snippet || {};
    const durationSeconds = detail?.contentDetails?.duration ? (() => {
      const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(detail.contentDetails.duration || '');
      if (!match) return 0;
      const [, h, m, s] = match;
      return (Number(h || 0) * 3600) + (Number(m || 0) * 60) + (Number(s || 0));
    })() : 0;

    return {
      id: `youtube-${videoId}`,
      title: (snippet.title || 'Unknown title').replace(/\s+/g, ' ').trim(),
      artist: snippet.channelTitle || 'Unknown artist',
      anime: query,
      category: 'opening',
      youtubeVideoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: durationSeconds,
      source: 'youtube'
    };
  });
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  const hasPlaylist = Boolean(YOUTUBE_PLAYLIST.youtubePlaylistId);

  res.json({
    ready: hasPlaylist,
    youtubeConfigured: Boolean(YOUTUBE_API_KEY),
    youtubeApiKey: YOUTUBE_API_KEY ? 'configured' : 'missing',
    message: hasPlaylist
      ? 'Configured YouTube playlist is available. Live YouTube search is optional.'
      : 'Missing VITE_YOUTUBE_API_KEY. Add it to your .env file and restart the server before using live YouTube search.'
  });
});

app.get('/api/songs', async (req, res) => {
  const library = getInitialAnimeTracks();
  res.json(library);
});

app.get('/api/playlists', (req, res) => {
  const library = getInitialAnimeTracks();
  res.json(Object.entries(library).map(([id, playlist]) => ({
    id,
    title: playlist.title,
    tag: playlist.tag,
    accent: playlist.accent,
    description: playlist.description,
    count: playlist.songs.length
  })));
});

app.get('/api/youtube/search', async (req, res) => {
  const query = (req.query.query || 'anime opening songs').toString().trim();
  if (!query) {
    return res.status(400).json({ error: 'Search query required.' });
  }

  try {
    const tracks = await searchYoutubeTracks(query, 10);
    res.json({ tracks });
  } catch (error) {
    console.error('[AnimeMusic] Search failed:', error.message);
    res.status(503).json({
      error: 'Search is temporarily unavailable.',
      message: error.message,
      tryAgain: true,
      fallbackTracks: getInitialAnimeTracks()
    });
  }
});

app.get('/api/youtube/oembed', async (req, res) => {
  const videoId = (req.query.videoId || '').toString().trim();
  if (!/^[\w-]{6,}$/.test(videoId)) {
    return res.status(400).json({ error: 'Valid YouTube video ID required.' });
  }

  try {
    const data = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`);
    res.json({
      videoId,
      title: data.title || `YouTube track ${videoId}`,
      artist: data.author_name || 'YouTube Music',
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    });
  } catch (error) {
    res.status(502).json({ error: 'Could not load YouTube track metadata.' });
  }
});

app.get('/api/wallpapers', (req, res) => {
  res.json(WALLPAPERS);
});

app.get('/api/quotes', (req, res) => {
  res.json(QUOTES);
});

app.get('/api/listeners', (req, res) => {
  const clientId = (req.query.clientId || '').toString().trim();
  const now = Date.now();
  for (const [id, lastSeen] of activeListeners) {
    if (now - lastSeen > LISTENER_TIMEOUT_MS) activeListeners.delete(id);
  }
  if (clientId) activeListeners.set(clientId, now);
  res.json({ count: activeListeners.size });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port, attempts = 0) {
  const p = Number(port) || 3000;
  const server = app.listen(p, () => {
    console.log('[AnimeMusic] Loaded configured YouTube playlist');
    console.log(`ANIMESCAPE running at http://localhost:${p}`);
    console.log(`  YouTube API configured: ${YOUTUBE_API_KEY ? 'true' : 'false'}`);
    console.log(`  Playlists API:  http://localhost:${p}/api/songs`);
    console.log(`  Search API:     http://localhost:${p}/api/youtube/search?query=anime+opening+songs`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempts < 10) {
      const next = p + 1;
      console.warn(`Port ${p} in use, trying ${next}...`);
      setTimeout(() => startServer(next, attempts + 1), 200);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  return server;
}

startServer(PORT);
