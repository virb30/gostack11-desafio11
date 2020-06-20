import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import { Image } from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {
  useNavigation,
  useRoute,
  NavigationHelpersContext,
} from '@react-navigation/native';
import formatValue from '../../utils/formatValue';

import api from '../../services/api';

import {
  Container,
  Header,
  ScrollContainer,
  FoodsContainer,
  Food,
  FoodImageContainer,
  FoodContent,
  FoodTitle,
  FoodDescription,
  FoodPricing,
  AdditionalsContainer,
  Title,
  TotalContainer,
  AdittionalItem,
  AdittionalItemText,
  AdittionalQuantity,
  PriceButtonContainer,
  TotalPrice,
  QuantityContainer,
  FinishOrderButton,
  ButtonText,
  IconContainer,
} from './styles';

interface Params {
  id: number;
}

interface Extra {
  id: number;
  name: string;
  value: number;
  quantity: number;
}

interface Food {
  id: number;
  name: string;
  description: string;
  price: number;
  category: number;
  image_url: string;
  formattedPrice: string;
  extras: Extra[];
}

const FoodDetails: React.FC = () => {
  const [food, setFood] = useState({} as Food);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [foodQuantity, setFoodQuantity] = useState(1);

  const navigation = useNavigation();
  const route = useRoute();

  const routeParams = route.params as Params;

  useEffect(() => {
    async function loadFood(): Promise<void> {
      const response = await api.get<Food>(`/foods/${routeParams.id}`);

      setFood({
        ...response.data,
        formattedPrice: formatValue(response.data.price),
      });

      setExtras(
        response.data.extras.map(extra => ({
          ...extra,
          quantity: 0,
        })),
      );

      const favoritesResponse = await api.get<Food[]>(`/favorites`);

      setIsFavorite(
        !!favoritesResponse.data.find(
          findFavorite => findFavorite.id === routeParams.id,
        ),
      );
    }

    loadFood();
  }, [routeParams]);

  function handleIncrementExtra(id: number): void {
    setExtras(state =>
      state.map(extra => {
        if (extra.id === id) {
          return {
            ...extra,
            quantity: extra.quantity + 1,
          };
        }
        return extra;
      }),
    );
  }

  function handleDecrementExtra(id: number): void {
    setExtras(state =>
      state.map(extra => {
        if (extra.id === id) {
          if (extra.quantity === 0) {
            return extra;
          }

          return {
            ...extra,
            quantity: extra.quantity - 1,
          };
        }

        return extra;
      }),
    );
  }

  function handleIncrementFood(): void {
    setFoodQuantity(quantity => quantity + 1);
  }

  function handleDecrementFood(): void {
    setFoodQuantity(quantity => {
      if (quantity === 1) {
        return quantity;
      }

      return quantity - 1;
    });
  }

  const toggleFavorite = useCallback(async () => {
    const { formattedPrice, extras: foodExtra, ...rest } = food;

    if (!isFavorite) {
      await api.post('/favorites', { ...rest });
    } else {
      await api.delete(`/favorites/${rest.id}`);
    }
    setIsFavorite(!isFavorite);
  }, [isFavorite, food]);

  const cartTotal = useMemo(() => {
    const foodTotal = food.price;

    const extrasTotal = extras.reduce((total, extra) => {
      return total + extra.value * extra.quantity;
    }, 0);

    return formatValue((foodTotal + extrasTotal) * foodQuantity);
  }, [extras, food, foodQuantity]);

  const handleFinishOrder = useCallback(async () => {
    const {
      id: product_id,
      name,
      description,
      category,
      image_url: thumbnail_url,
      price,
    } = food;

    const foodTotal = price;

    const extrasTotal = extras.reduce((total, extra) => {
      return total + extra.value * extra.quantity;
    }, 0);

    const total = (foodTotal + extrasTotal) * foodQuantity;

    await api.post('/orders', {
      product_id,
      name,
      description,
      category,
      thumbnail_url,
      price: total,
      extras,
    });

    navigation.navigate('Dashboard', {});
  }, [extras, food, foodQuantity, navigation]);

  // Calculate the correct icon name
  const favoriteIconName = useMemo(
    () => (isFavorite ? 'favorite' : 'favorite-border'),
    [isFavorite],
  );

  useLayoutEffect(() => {
    // Add the favorite icon on the right of the header bar
    navigation.setOptions({
      headerRight: () => (
        <MaterialIcon
          name={favoriteIconName}
          size={24}
          color="#FFB84D"
          onPress={() => toggleFavorite()}
        />
      ),
    });
  }, [navigation, favoriteIconName, toggleFavorite]);

  return (
    <Container>
      <Header />

      <ScrollContainer>
        <FoodsContainer>
          <Food>
            <FoodImageContainer>
              <Image
                style={{ width: 327, height: 183 }}
                source={{
                  uri: food.image_url,
                }}
              />
            </FoodImageContainer>
            <FoodContent>
              <FoodTitle>{food.name}</FoodTitle>
              <FoodDescription>{food.description}</FoodDescription>
              <FoodPricing>{food.formattedPrice}</FoodPricing>
            </FoodContent>
          </Food>
        </FoodsContainer>
        <AdditionalsContainer>
          <Title>Adicionais</Title>
          {extras.map(extra => (
            <AdittionalItem key={extra.id}>
              <AdittionalItemText>{extra.name}</AdittionalItemText>
              <AdittionalQuantity>
                <Icon
                  size={15}
                  color="#6C6C80"
                  name="minus"
                  onPress={() => handleDecrementExtra(extra.id)}
                  testID={`decrement-extra-${extra.id}`}
                />
                <AdittionalItemText testID={`extra-quantity-${extra.id}`}>
                  {extra.quantity}
                </AdittionalItemText>
                <Icon
                  size={15}
                  color="#6C6C80"
                  name="plus"
                  onPress={() => handleIncrementExtra(extra.id)}
                  testID={`increment-extra-${extra.id}`}
                />
              </AdittionalQuantity>
            </AdittionalItem>
          ))}
        </AdditionalsContainer>
        <TotalContainer>
          <Title>Total do pedido</Title>
          <PriceButtonContainer>
            <TotalPrice testID="cart-total">{cartTotal}</TotalPrice>
            <QuantityContainer>
              <Icon
                size={15}
                color="#6C6C80"
                name="minus"
                onPress={handleDecrementFood}
                testID="decrement-food"
              />
              <AdittionalItemText testID="food-quantity">
                {foodQuantity}
              </AdittionalItemText>
              <Icon
                size={15}
                color="#6C6C80"
                name="plus"
                onPress={handleIncrementFood}
                testID="increment-food"
              />
            </QuantityContainer>
          </PriceButtonContainer>

          <FinishOrderButton onPress={() => handleFinishOrder()}>
            <ButtonText>Confirmar pedido</ButtonText>
            <IconContainer>
              <Icon name="check-square" size={24} color="#fff" />
            </IconContainer>
          </FinishOrderButton>
        </TotalContainer>
      </ScrollContainer>
    </Container>
  );
};

export default FoodDetails;
