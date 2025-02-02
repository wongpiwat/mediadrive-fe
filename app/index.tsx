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
import * as Location from 'expo-location';

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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        timeInterval: 1000,
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const speedMps = (location.coords.speed || 0) * 2.23694; // Convert m/s to mph (1 m/s = 2.23694 mph)
      setSpeed(speedMps);
    }

    const intervalId = setInterval(getCurrentLocation, 10000); // Call every 10 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  useEffect(() => {
    let intervalId;

    const fetchSongs = async () => {
      try {
        console.log('[DEBUG] send speed:', speed);
        const response = await axios.get(`${ENDPOINT}/${speed}`);
        console.log('[DEBUG] songs:', response.data);
        setSongs(response.data);
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };

    fetchSongs(); // Initial fetch songs

    intervalId = setInterval(fetchSongs, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

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
      {/*<ThemedView style={styles.titleContainer}>*/}
      {/*  <ThemedText type="title">Welcome!</ThemedText>*/}
      {/*  <HelloWave />*/}
      {/*</ThemedView>*/}
      <View style={styles.container}>
        {errorMsg && <Text style={styles.title}>{errorMsg}</Text>}
        <Text style={styles.title}>
          Current Speed: {Math.round(speed)} (MPH)
        </Text>
        <Button title="Play" onPress={() => playSong(songs[0].preview, 0)} />
        <FlatList
          data={songs}
          keyExtractor={item => item?.id}
          renderItem={({ item, index }) => (
            <View style={styles.songContainer}>
              <Text>
                {item?.title} - {item?.artist}
              </Text>
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
