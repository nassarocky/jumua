import { useNavigation, StackActions } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Image, StatusBar, View } from 'react-native';
import Text from '@components/common/text';
import { useTheme } from '@styles/hooks';

const logo = require('@images/logo.png');

const Splash = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  useEffect(() => {
    setTimeout(() => {
      navigation.dispatch(StackActions.replace('Main'));
    }, 300);
  }, [navigation]);
  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent={true}
        backgroundColor="transparent"
      />
      <View className="flex-1 justify-center items-center bg-primary gap-6">
        <Image
          source={logo}
          className="w-28 h-28 rounded-2xl"
          resizeMode="contain"
        />
        <Text
          type="display"
          className="text-content-secondary text-4xl text-center"
        >
          JUMUA{'\n'}CHINA
        </Text>
      </View>
    </>
  );
};

export default Splash;
