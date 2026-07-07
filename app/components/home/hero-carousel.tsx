import { formatImageUrl } from '@utils/image-url';
import { cssInterop } from 'nativewind';
import React from 'react';
import { Dimensions, Image, Linking, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import Carousel, {
  ICarouselInstance,
  Pagination,
} from 'react-native-reanimated-carousel';
import { useNavigation, TabActions } from '@react-navigation/native';
import { Pressable } from 'react-native-gesture-handler';
import { HERO_BANNERS, HeroBanner } from '@constants/hero-banners';

const width = Dimensions.get('window').width;

const PagiationTw = cssInterop(Pagination.Basic, {
  containerClassName: 'containerStyle',
  dotClassName: 'dotStyle',
  activeDotClassName: 'activeDotStyle',
});

const HeroCarousel = () => {
  const ref = React.useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);
  const navigation = useNavigation();
  const data = HERO_BANNERS;

  if (!data.length) {
    return null;
  }

  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      count: index - progress.value,
      animated: true,
    });
  };

  const handleBannerPress = (banner: HeroBanner) => {
    switch (banner.action.type) {
      case 'product':
        navigation.navigate('ProductDetail', {
          productId: banner.action.entityId,
        });
        break;
      case 'category':
        navigation.navigate('CategoryDetail', {
          categoryId: banner.action.entityId,
        });
        break;
      case 'collection':
        navigation.navigate('CollectionDetail', {
          collectionId: banner.action.entityId,
        });
        break;
      case 'phone':
        Linking.openURL(`tel:${banner.action.phone.replace(/\s/g, '')}`);
        break;
      case 'tab':
        navigation.dispatch(TabActions.jumpTo(banner.action.tab));
        break;
      case 'none':
        break;
    }
  };

  return (
    <View className="items-center gap-2 mb-4">
      <Carousel
        ref={ref}
        width={width}
        height={115}
        data={data}
        loop={true}
        autoPlay={true}
        autoPlayInterval={4000}
        onProgressChange={progress}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.92,
          parallaxScrollingOffset: 0,
        }}
        renderItem={({ index }) => {
          const banner = data[index];
          const uri = formatImageUrl(banner.imageUrl);
          return (
            <Pressable onPress={() => handleBannerPress(banner)}>
              <Image
                source={{ uri }}
                className="w-full h-full rounded-lg border border-gray-200"
                resizeMode="cover"
              />
            </Pressable>
          );
        }}
      />
      {data.length > 1 && (
        <PagiationTw
          progress={progress}
          data={data}
          onPress={onPressPagination}
          dotClassName="bg-gray-400 rounded-full"
          activeDotClassName="bg-content"
          containerClassName="gap-3"
          size={8}
        />
      )}
    </View>
  );
};

export default HeroCarousel;
