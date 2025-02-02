import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Image,
  StyleSheet,
} from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { HelloWave } from '@/components/HelloWave';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import axios from 'axios';
import { Audio } from 'expo-av';
import Geolocation from '@react-native-community/geolocation';

const ENDPOINT = process.env.EXPO_PUBLIC_API_ENDPOINT;

type Song = {
  id: number;
  title: string;
  artist: string;
  preview: string;
  link: string;
};

export default function HomeScreen() {
  const [speed, setSpeed] = useState<number>(0);
  const [songs, setSongs] = useState<Song[]>([]);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    let watchId: number | null = null;

    const getLocationUpdates = () => {
      watchId = Geolocation.watchPosition(
        position => {
          if (position.coords.speed) {
            setSpeed(position.coords.speed);
          }
        },
        error => {
          console.log(error);
        },
        { enableHighAccuracy: true, distanceFilter: 10 },
      );
    };

    getLocationUpdates();

    return () => {
      if (watchId) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await axios.get(`${ENDPOINT}/${speed}`);
      console.log('[DEBUG] songs:', response.data);
      setSongs(response.data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const playSong = async (songUrl: string, songIndex: number) => {
    if (!songUrl) {
      alert('No preview available for this song.');
      return;
    }

    // Stop any currently playing song
    if (sound) {
      await sound?.unloadAsync();
    }

    // Load and play new song
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: songUrl });
    setSound(newSound);
    await newSound.playAsync();

    // Set a callback to play the next song when the current song ends
    newSound.setOnPlaybackStatusUpdate(async status => {
      if (status?.didJustFinish) {
        const nextSongIndex = songIndex + 1;
        if (nextSongIndex < songs.length) {
          const nextSong = songs[nextSongIndex];
          await playSong(nextSong.preview, nextSongIndex);
        }
      }
    });
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <View style={styles.container}>
        <Text style={styles.title}>Current Speed: {Math.abs(speed)} (MPH)</Text>
        <Button title="Get Songs" onPress={fetchSongs} />
        <FlatList
          data={songs}
          keyExtractor={item => item?.id}
          renderItem={({ item, index }) => (
            <View style={styles.songContainer}>
              <Text>
                {item?.title} - {item?.artist}
              </Text>
              <Button
                title="Play"
                onPress={() => playSong(item.preview, index)}
              />
            </View>
          )}
        />
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 20, marginBottom: 10 },
  input: { width: '80%', borderWidth: 1, padding: 8, marginBottom: 10 },
  songContainer: { marginVertical: 10, alignItems: 'center' },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
