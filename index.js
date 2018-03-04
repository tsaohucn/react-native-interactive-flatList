import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  PanResponder,
  Platform,
  Animated,
  Easing,
  FlatList,
  Image,
  Dimensions,
  Button,
  InteractionManager
} from 'react-native';

const { width, height } = Dimensions.get('window')

const scrollScaleParam = Platform.OS === 'ios' ? 2*2 : 2

const scaleThreshold = 0.007

export default class PinchZoomView extends Component {

  static propTypes = {
    ...View.propTypes,
    scalable: PropTypes.bool,
    content: PropTypes.array
  };

  static defaultProps = {
    scalable: true,
    content: new Array
  };

  constructor(props) {
    super(props);
    this.lastDistance = null
    this.animatedScale = new Animated.Value(1)
    this.animatedheight = new Animated.Value(height)
    this.animatedPositionX = new Animated.Value(0)
    this.animatedPositionY = new Animated.Value(0)
    this.pinch = false
    this.maxScrollY = height
    this.isTop = true
    this.isBottom = false
    this.scrollY = 0
    this.contentTranslate = 0
    this.lastScrollY = 0
    this.lastContentTranslate = 0
    this.moveCenterX = 0 // 相對正中央
    this.moveCenterY = 0 // 相對正中央

  }

  componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder,
      onStartShouldSetPanResponderCapture: evt => true,
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder,
      onMoveShouldSetPanResponderCapture: evt => true,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminationRequest: evt => true,
      onShouldBlockNativeResponder: evt => true,
      onPanResponderEnd: evt => true
    });
  }

  componentDidMount = () => {
    this.animatedScale.addListener(({value}) => {
      if (value < 1) {
        const fixBottomOffset = (this.animatedheight._value/value - this.animatedheight._value)
        this._flatList.scrollToOffset({animated: true, offset: this.scrollY - fixBottomOffset})
      }
    })    
  }

  componentWillUnmount() {
    this.animatedScale.removeListener()
  }

  _handleStartShouldSetPanResponder = (e, gestureState) => {
    // don't respond to single touch to avoid shielding click on child components
    if (Platform.OS === 'ios') {
      return true;
    } else {
      return true;
    }
  }

  _handleMoveShouldSetPanResponder = (e, gestureState) => {
    if (Platform.OS === 'ios') {
      return true;
    } else {
      //return this.props.scalable && gestureState.dx > 2 || gestureState.dy > 2 || gestureState.numberActiveTouches === 2;
      return true; // Android 縮訪抓在Modal裡抓不到
    }
  }

  _handlePanResponderGrant = (e, gestureState) => { 
  }

  _handlePanResponderEnd =  (e, gestureState) => {
    this.pinch = false
    this.lastDistance = null
    this.lastScrollY = this.scrollY
    if (this.animatedScale._value > 2) {
      this._bigSpringBack(2)
    } else if (this.animatedScale._value >= 1 && this.animatedScale._value <=2) {
      this._middleSpringBack()
    } else if (this.animatedScale._value < 1) {
      this._smallSpringBack(1)
    }
    
  }



  _handlePanResponderMove = (e, gestureState) => {
    //gestureState.numberActiveTouches 在滑動過程中很容易誤判
    if (gestureState.numberActiveTouches === 2) { // zoom
      if (!this.pinch) {
        this.moveCenterX = ((e.nativeEvent.changedTouches[0].pageX + e.nativeEvent.changedTouches[1].pageX)/2 - width/2)/this.animatedScale._value - this.animatedPositionX._value
        this.moveCenterY = ((e.nativeEvent.changedTouches[0].pageY + e.nativeEvent.changedTouches[1].pageY)/2 - height/2)/this.animatedScale._value - this.animatedPositionY._value
      }
      this.pinch = true
      let dx = Math.abs(e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX)
      let dy = Math.abs(e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY)
      let distance = Math.sqrt(dx * dx + dy * dy)
      if (!this.lastDistance) {
        this.lastDistance = distance
      }
      if (this.lastDistance) { // 計算放大倍率
        let scale = distance/this.lastDistance*this.animatedScale._value
        if (scale > 3) {
          scale = 3
        } else if (scale < 0.5) {
          scale = 0.5
        }
        
        if (scale === 0.5) {
          let diffscale = Math.abs(1-scale/this.animatedScale._value)
          if (diffscale < scaleThreshold) {
            scale = this.animatedScale._value
            distance = this.lastDistance
          }
        }
        
        let positionX = ((e.nativeEvent.changedTouches[0].pageX + e.nativeEvent.changedTouches[1].pageX)/2 - width/2)/scale-this.moveCenterX
        let positionY = ((e.nativeEvent.changedTouches[0].pageY + e.nativeEvent.changedTouches[1].pageY)/2 - height/2)/scale-this.moveCenterY  
        if (scale >= 1) {
          let widthBoundary = (scale*width/2-width/4)/scale
          let heightBoundary = (scale*height/2-height*3/8)/scale
          positionX = Math.abs(positionX) > widthBoundary ? widthBoundary*Math.sign(positionX) : positionX
          positionY = Math.abs(positionY) > heightBoundary ? heightBoundary*Math.sign(positionY) : positionY 
        } else {
          positionX = this.animatedPositionX._value
          positionY = this.animatedPositionY._value
        }
        this._animated(positionX,positionY,scale,0)
        this.lastDistance = distance
      }
      
    } else if (gestureState.numberActiveTouches === 1 && !this.pinch) {
      // translation
      /*
      if (Math.abs(gestureState.dy) > 0) {
        // scroll
        this.scrollY = this.lastScrollY - scrollScaleParam*gestureState.dy
        if (this.scrollY <= 0) {
          this.scrollY = 0
        } else if (this.scrollY >= this.maxScrollY) {
          this.scrollY = this.maxScrollY
        }
        this._flatList.scrollToOffset({animated: false, offset: this.scrollY})
      } 
      
      if (this.animatedScale._value > 1 && Math.abs(gestureState.dx) > 0) {
        //alert('平移了')
        this.contentTranslate = this.lastContentTranslate + gestureState.dx
        const maxTranslate = ((width*this.animatedScale._value) - width)/4
        if (Math.abs(this.contentTranslate) > maxTranslate) {
          this.contentTranslate = Math.sign(this.contentTranslate)*maxTranslate
        }
        this.animatedPositionX.setValue(this.contentTranslate)
      }
      */
      
    }
    
  }
  
  _animatedDirectly = (positionX,positionY,scale) => {
    this.animatedPositionX.setValue(positionX)
    this.animatedPositionY.setValue(positionY)
    this.animatedScale.setValue(scale)   
  }
  


  _animated = (positionX,positionY,scale,duration) => {
    Animated.parallel([
      Animated.timing(this.animatedPositionX,{
        toValue: positionX,
        duration: duration
      }),
      Animated.timing(this.animatedPositionY,{
        toValue: positionY,
        duration: duration
      }),
      Animated.timing(this.animatedScale,{
        toValue: scale,
        duration: duration
      })
    ]).start(() => {
      //
    })    
  }
  
  _springHideBlackBlock = () => {
    let widthBoundary = (this.animatedScale._value*width/2-width/2)/this.animatedScale._value
    let heightBoundary = (this.animatedScale._value*height/2-height/2)/this.animatedScale._value
    let springBackX = this.animatedPositionX._value
    let springBackY = this.animatedPositionY._value
    if (Math.abs(this.animatedPositionX._value) > widthBoundary) {
      springBackX = widthBoundary*Math.sign(this.animatedPositionX._value)
    }
    if (Math.abs(this.animatedPositionY._value) > heightBoundary) {
      springBackY = heightBoundary*Math.sign(this.animatedPositionY._value)
    }
    return {springBackX,springBackY}
  }

  _bigSpringBack = (scaleValue) => {
    let springBackX = this._springHideBlackBlock().springBackX
    let springBackY = this._springHideBlackBlock().springBackY
    Animated.parallel([
      Animated.timing(this.animatedPositionX,{
        toValue: springBackX,
        duration: 200
      }),
      Animated.timing(this.animatedPositionY,{
        toValue: springBackY,
        duration: 200
      }),
      //Animated.timing(this.animatedScale,{
      //  toValue: scaleValue,
      //  duration: 200
      //})
    ]).start(() => {
      this.pinch = false
    })
  }

  _middleSpringBack = () => {
    let springBackX = this._springHideBlackBlock().springBackX
    let springBackY = this._springHideBlackBlock().springBackY
    Animated.parallel([
      Animated.timing(this.animatedPositionX,{
        toValue: springBackX,
        duration: 200
      }),
      Animated.timing(this.animatedPositionY,{
        toValue: springBackY,
        duration: 200
      })
    ]).start(() => {
      this.pinch = false
    })
  }

  _smallSpringBack = (scaleValue) => {
    Animated.parallel([
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200,
        //easing: Easing.out(Easing.ease)
      }),
      Animated.timing(this.animatedPositionX,{
        toValue: 0,
        duration: 200,
        //easing: Easing.out(Easing.ease)
      }),
      Animated.timing(this.animatedPositionY,{
        toValue: 0,
        duration: 200,
        //easing: Easing.out(Easing.ease)
      })
      //Animated.timing(this.animatedheight,{
      //  toValue: heightValue,
      //  duration: 200,
        //easing: Easing.out(Easing.ease)
      //}),
      //Animated.timing(this.animatedPositionX,{
      //  toValue: 0,
      //  duration: 200,
        //easing: Easing.out(Easing.ease)
      //})
    ]).start(() => {
      this.pinch = false
      //alert(this.animatedScale)
      //this._flatList.scrollToOffset({animated: false, offset: this.scrollY})
      // do something
    })
  }

  onScroll = ({layoutMeasurement, scrollY, contentSize}) => {
    this.maxScrollY = contentSize.height - layoutMeasurement.height
  }

  render() {
    return (
        <Animated.View 
          {...this.gestureHandlers.panHandlers}
            style={[styles.container,
              //this.props.style
              ,{
              height: this.animatedheight,
              transform: [
                {scaleX: this.animatedScale},
                {scaleY: this.animatedScale},
                {translateX: this.animatedPositionX},
                {translateY: this.animatedPositionY}
              ]
            }]}
            >
              <FlatList
                ref={flatList => this._flatList = flatList}
                removeClippedSubviews
                onEndReachedThreshold={0.1}
                data={this.props.content}
                numColumns={1}
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                onScroll={({nativeEvent}) => {
                  this.onScroll(nativeEvent)
                }}
                renderItem={({ item }) =>
                  <Image
                    resizeMode={'contain'} 
                    style={{width, height: item.height, backgroundColor: 'black'}}
                    source={{uri: item.url}}
                  />
                }
              /> 
       </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});