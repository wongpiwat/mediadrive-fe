import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';

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
  const [songs, setSongs] = useState<Song[]>([]);
  const [sound, setSound] = useState(null);
  const [currentSong, setCurrentSong] = useState<Song>();
  const [currentIndex, setCurrentIndex] = useState<Number>(0);

  const speedRef = useRef(0);

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

      // Convert m/s to mph (1 m/s = 2.23694 mph)
      speedRef.current = (location.coords.speed || 0) * 2.23694;
    }

    const intervalId = setInterval(getCurrentLocation, 10000); // Call every 10 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        console.log('[DEBUG] send speed:', speedRef.current);
        const response = await axios.get(`${ENDPOINT}/${speedRef.current}`);
        // console.log('[DEBUG] songs:', response.data);
        setSongs(response.data);
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };

    fetchSongs(); // Initial fetch songs

    const intervalId = setInterval(fetchSongs, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [speedRef.current]);

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
    setCurrentSong(songs[songIndex]);
    setCurrentIndex(songIndex);
    console.log(`[DEBUG] Playing song Index: ${songIndex}`);
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

  const pauseSong = async () => {
    if (sound) {
      await sound?.pauseAsync();
    }
  };

  // Move to next song button
  const nextSong = async () => {
    if (sound) {
      await sound?.unloadAsync();
    }
    const nextSongIndex = currentIndex + 1;
    if (nextSongIndex < songs.length) {
      const nextSong = songs[nextSongIndex];
      await playSong(nextSong.preview, nextSongIndex);
    }
  };

  // Move to previous song button
  const prevSong = async () => {
    if (sound) {
      await sound?.unloadAsync();
    }
    const prevSongIndex = currentIndex - 1;
    if (prevSongIndex >= 0) {
      const prevSong = songs[prevSongIndex];
      await playSong(prevSong.preview, prevSongIndex);
    }
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
      <View style={styles.container}>
        {errorMsg && <Text style={styles.title}>{errorMsg}</Text>}
        <Text style={styles.title}>
          Current Speed: {Math.round(speedRef.current)} (MPH)
        </Text>

        <Text style={styles.title}>
          {currentIndex}: Current Sound: {currentSong?.title} -
          {currentSong?.artist}
        </Text>

        <Button title="Play" onPress={() => playSong(songs[0].preview, 0)} />
        <Button title="Pause" onPress={() => pauseSong()} />
        <Button title="Next" onPress={() => nextSong()} />
        <Button title="Back" onPress={() => prevSong()} />
        <FlatList
          data={songs}
          keyExtractor={item => item?.id}
          renderItem={({ item, index }) => (
            <View style={styles.songContainer}>
              <Text>
                {index}: {item?.title} - {item?.artist}
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
