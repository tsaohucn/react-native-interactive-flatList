import React, { Component, PureComponent } from 'react'
import PropTypes from 'prop-types'
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
  InteractionManager,
  ScrollView,
  Text
} from 'react-native'
import TimerMixin from 'react-timer-mixin'
import ComicBookImage from './ComicBookImage'

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export default class ComicBook extends Component {

  static propTypes = {
    ...View.propTypes,
    scalable: PropTypes.bool,
    content: PropTypes.array
  }

  static defaultProps = {
    scalable: true,
    content: new Array
  }

  constructor(props) {
    super(props)
    // 滾動
    this.state = {
      isScrollEnabled: true,
      animatedScale: new Animated.Value(1),
      animatedoffsetX: new Animated.Value(0),
      animatedoffsetY: new Animated.Value(0)
    }
    // 縮放
    this.lastDistance = null
    this.focusPointX = 0 // 關注點Ｘ
    this.focusPointY = 0 // 關注點Ｙ
    this.isSingleRelease = true
    this.isDoubleRelease = true
    this.isSingleAnimated = false
    //this.isScroll = false
    //this.isLastSingleClick = false
    //this.lastTimetamp = null
    this.lastOffsetY = 0
    this.lastScroll = 0
    // Never Flag
    //this.isNeverPinch = true
    //this.isNeverTranslate = true
    //this.isNeverSingleRelease = true
    //this.isNeverPanResponderMove = true
    //this.isNeverScaleSmall = true
    //this.isNeverCountClick = true
    //this.isNeverFingerTranslate = true
    // 滾動
    //this.lastScrollY = null
    // 平移
    //this.lastTranslateMoveX = null
    //this.lastTranslateMoveY = null
    //this.lastTranslateX = 0
    //this.lastTranslateY = 0
    // 單擊 雙擊
    //this.clickCount = 0
    //this.singleFingerStayCount = 0
    //this.clickX = null
    //this.clickY = null
    //this.singleClickX = null
    //this.singleClickY = null
    //this.scrollOffset = 0
    //this.contentSize = height
    //
    //this.isInAnimated = false
  }

  UNSAFE_componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      // Setter
      onStartShouldSetPanResponderCapture: evt => true, // 開始觸碰，是否捕捉成為響應者，手勢放在flatlist裏根本不會執行
      onStartShouldSetPanResponder: evt => false,//!this.isInAnimated, // 開始觸碰，是否成為響應者，手勢放在flatlist裏根本不會執行
      onMoveShouldSetPanResponderCapture: evt => false,  // 開始移動，是否捕捉成為響應者
      onMoveShouldSetPanResponder:  evt => false,//!this.isInAnimated, // 開始移動，是否成為響應者
      onPanResponderTerminationRequest: evt => true, // 有外層其他響應者，是否釋放響應權，最外層不用設
      // Handler
      onPanResponderGrant: this.onPanResponderGrant,
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderRelease: this.onPanResponderRelease,
      onPanResponderTerminate : this.onPanResponderTerminate
    })
  }

  onMoveShouldSetPanResponderCapture = (evt, gestureState) => {
    /*
    if (gestureState.numberActiveTouches === 2) {
      this.flatlist.setNativeProps({scrollEnabled: false})
      return true
    } else { // gestureState.numberActiveTouches === 1
      if (gestureState.dx === 0 && gestureState.dy === 0 && gestureState.vx === 0 && gestureState.vy === 0 && this.lastScroll === 0) {
        console.log(evt.nativeEvent.timestamp)
        
        if () {
          this.flatlist.setNativeProps({scrollEnabled: true})
          return false
        } else {
          this.flatlist.setNativeProps({scrollEnabled: false})
          return true
        }
        return false
      } else {
        this.flatlist.setNativeProps({scrollEnabled: true})
        return false
      }
    }*/
  }

  onPanResponderGrant = (evt, gestureState) => {
    //console.warn('here')
    //if (gestureState.numberActiveTouches === 1 && this.state.animatedScale._value >= 1) {
      //console.warn('快速單點')
      //console.warn(gestureState.x0)
      //console.warn(evt.nativeEvent.touches[0].pageX)
    //}
  }

  onPanResponderMove = (evt, gestureState) => {
    // android gestureState.numberActiveTouches 雙手離開時很容以 先 1 再 2
    if (gestureState.numberActiveTouches === 2) {
      const PX_1 = evt.nativeEvent.touches[0].pageX
      const PX_2 = evt.nativeEvent.touches[1].pageX
      const PY_1 = evt.nativeEvent.touches[0].pageY
      const PY_2 = evt.nativeEvent.touches[1].pageY
      const distance = this.getDistance(PX_1,PX_2,PY_1,PY_2)
      if (!(!this.isSingleRelease && !this.isDoubleRelease)) {
        this.isSingleRelease = false
        this.isDoubleRelease = false
        this.lastDistance = distance
        this.focusPointX = ((PX_1 + PX_2)/2 - width/2)/this.state.animatedScale._value - this.state.animatedoffsetX._value
        this.focusPointY = ((PY_1 + PY_2)/2 - height/2)/this.state.animatedScale._value - this.state.animatedoffsetY._value
      }
      let scale = null      
      if (this.state.animatedScale._value <= 1) {
        scale = (distance/this.lastDistance) * this.state.animatedScale._value
      } else {
        scale = ((distance/this.lastDistance) -1) + this.state.animatedScale._value
      }
      if (scale > 3) {
        scale = 3
      } else if (scale < 0.5) {
        scale = 0.5
      }
      const magnifierCenterX = (PX_1 + PX_2)/2 - width/2 // 目前雙手中心
      const magnifierCenterY = (PY_1 + PY_2)/2 - height/2 // 目前雙手中心
      const offsetX = magnifierCenterX/scale-this.focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = magnifierCenterY/scale-this.focusPointY // 關注點到雙手中心需要的偏移量 
      if (scale >= 1) { 
        // 限制放大超過邊界時的偏移速度
        const offsetBoundaryX = (scale*width/2-width/2)/scale
        const offsetBoundaryY = (scale*height/2-height/2)/scale
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/scale) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(scale*1.5)) : offsetY
      }
      this.lastDistance = distance
      Animated.event([null,{
          offsetX: this.state.animatedoffsetX,
          offsetY: this.state.animatedoffsetY,
          scale: this.state.animatedScale
      }])(evt, {offsetX: offsetX, offsetY: offsetY,scale: scale})  
    } else {
      // ACTION_POINTER_UP 有問題啊
      if (!(this.isSingleRelease && !this.isDoubleRelease)) {
        this.isSingleRelease = true
        this.isDoubleRelease = false
        if (!this.isSingleAnimated && this.state.animatedScale._value < 1) {
          this.singleReleaseAnimation()
        }
        this.focusPointX = gestureState.moveX/this.state.animatedScale._value - this.state.animatedoffsetX._value
        this.focusPointY = gestureState.moveY/this.state.animatedScale._value - this.state.animatedoffsetY._value
      }
      if (this.state.animatedScale._value > 1) {
      const magnifierCenterX = gestureState.moveX // 目前雙手中心
      const magnifierCenterY = gestureState.moveY // 目前雙手中心
      const offsetX = magnifierCenterX/this.state.animatedScale._value-this.focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = magnifierCenterY/this.state.animatedScale._value-this.focusPointY // 關注點到雙手中心需要的偏移量 
      Animated.event([null,{
        offsetX: this.state.animatedoffsetX,
        offsetY: this.state.animatedoffsetY,
      }])(evt, {offsetX: offsetX,offsetY: offsetY}) 
      }
    }
  }

  onPanResponderTerminate = (evt, gestureState) => {
    this.onPanResponderRelease()
  }

  onPanResponderRelease = (evt, gestureState) => {
    this.isSingleRelease = true
    this.isDoubleRelease = true
    if (this.state.animatedScale._value > 1.5) {
      Animated.parallel([
        Animated.timing(this.state.animatedScale,{
          toValue: 1.5,
          duration: 150
        }),
        Animated.timing(this.state.animatedoffsetX,{
          toValue: this.springHideBlackBlock(1.5).offsetX,
          duration: 150
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: this.springHideBlackBlock(1.5).offsetY,
          duration: 150
        })
      ]).start()
    } else if (this.state.animatedScale._value > 1 && this.state.animatedScale._value <= 1.5) {
      Animated.parallel([
        Animated.timing(this.state.animatedoffsetX,{
          toValue: this.springHideBlackBlock(this.state.animatedScale._value).offsetX,
          duration: 150
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: this.springHideBlackBlock(this.state.animatedScale._value).offsetY,
          duration: 150
        })
      ]).start()
    } else if (this.state.animatedScale._value === 1) {
      this.flatlist.setNativeProps({scrollEnabled: true})
    } else {
      if (!this.isSingleAnimated) {
        Animated.parallel([
          Animated.timing(this.state.animatedScale,{
            toValue: 1,
            duration: 150
          }),
          Animated.timing(this.state.animatedoffsetX,{
            toValue: 0,
            duration: 150
          }),
          Animated.timing(this.state.animatedoffsetY,{
            toValue: 0,
            duration: 150
          })
        ]).start(result => {
          if (result.finished) {
            this.flatlist.setNativeProps({scrollEnabled: true})
          }
        })
      }
    }
  }

  singleReleaseAnimation = () => {
    this.isSingleAnimated = true
    Animated.parallel([
      Animated.timing(this.state.animatedScale,{
        toValue: 1,
        duration: 150
      }),
      Animated.timing(this.state.animatedoffsetX,{
        toValue: 0,
        duration: 150
      }),
      Animated.timing(this.state.animatedoffsetY,{
        toValue: 0,
        duration: 150
      })
    ]).start(result => {
      this.isSingleAnimated = false
      if (result.finished) {
        this.flatlist.setNativeProps({scrollEnabled: true})
      }
    })      
  }

  onScrollBeginDrag = ({nativeEvent}) => {
    this.lastOffsetY = nativeEvent.contentOffset.y
    //console.log(this.lastOffsetY)
  }

  onScroll = ({nativeEvent}) => {
    //console.log(nativeEvent.contentOffset.y- this.lastOffsetY)
    this.lastScroll = nativeEvent.contentOffset.y - this.lastOffsetY
  }

  getDistance = (PX_1,PX_2,PY_1,PY_2) => {
    const dx = Math.abs(PX_1 - PX_2)
    const dy = Math.abs(PY_1 - PY_2)
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance 
  }

  springHideBlackBlock = scale => {
    const offsetBoundaryX = (scale*width/2-width/2)/scale
    const offsetBoundaryY = (scale*height/2-height/2)/scale
    let offsetX = this.state.animatedoffsetX._value
    let offsetY = this.state.animatedoffsetY._value
    if (Math.abs(this.state.animatedoffsetX._value) > offsetBoundaryX) {
      offsetX = offsetBoundaryX*Math.sign(this.state.animatedoffsetX._value)
    }
    if (Math.abs(this.state.animatedoffsetY._value) > offsetBoundaryY) {
      offsetY = offsetBoundaryY*Math.sign(this.state.animatedoffsetY._value)
    }
    return {offsetX,offsetY}
  }

  render() {
    if (Platform.OS === 'ios') {
      return (
        <View 
          style={styles.comicbook}
        >
          <AnimatedFlatList
            {...this.gestureHandlers.panHandlers}
            style={{
              transform: [
                {scaleX: this.state.animatedScale},
                {scaleY: this.state.animatedScale},
                {translateX: this.state.animatedoffsetX},
                {translateY: this.state.animatedoffsetY}
              ]
            }}
              //initialScrollIndex={30}
            ref={ref => this.flatlist = ref}
            onEndReachedThreshold={0.1}
            data={this.props.content}
            numColumns={1}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            horizontal={false}
            //onScrollBeginDrag={this.onScrollBeginDrag}
            //onScroll={this.onScroll}
            renderItem={({ item }) =>
              <ComicBookImage
                resizeMode={'contain'} 
                style={{width, height: width, backgroundColor: 'black'}}
                source={{uri: item.uri}}
                placeholderSource={require('./ComicBook.png')}
                loadingStyle={ styles.loadingStyle }
              />
            }
          />
        </View>
      )
    } else {
      return (
        <View 
          style={styles.comicbook}
          {...this.gestureHandlers.panHandlers}
        >
          <AnimatedFlatList
            style={{
              transform: [
                {scaleX: this.state.animatedScale},
                {scaleY: this.state.animatedScale},
                {translateX: this.state.animatedoffsetX},
                {translateY: this.state.animatedoffsetY}
              ]
            }}
              //initialScrollIndex={30}
            ref={ref => this.flatlist = ref}
            onEndReachedThreshold={0.1}
            data={this.props.content}
            numColumns={1}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            horizontal={false}
            onScrollBeginDrag={this.onScrollBeginDrag}
            onScroll={this.onScroll}
            renderItem={({ item }) =>
              <ComicBookImage
                resizeMode={'contain'} 
                style={{width, height: width, backgroundColor: 'black'}}
                source={{uri: item.uri}}
                placeholderSource={require('./ComicBook.png')}
                loadingStyle={ styles.loadingStyle }
              />
            }
          />
        </View>
      )
    }
  }
}

const styles = {
  comicbook: {
    flex: 1,
    backgroundColor: 'black'
  },
  loadingStyle: { 
    size: 'large', 
    color: '#b3b3b3' 
  },
  dimensions: {
    width, 
    height: width
  }
}