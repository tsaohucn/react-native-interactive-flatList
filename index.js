import React, { Component } from 'react'
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
  InteractionManager
} from 'react-native'

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

//const scaleThreshold = 0.007

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
      isScrollEnabled: true
    }
    this.contentOffset = 0
    // 縮放
    this.lastDistance = null
    this.animatedScale = new Animated.Value(1)
    this.animatedheight = new Animated.Value(height)
    this.animatedoffsetX = new Animated.Value(0)
    this.animatedoffsetY = new Animated.Value(0)
    this.focusPointX = 0 // 關注點Ｘ
    this.focusPointY = 0 // 關注點Ｙ
    this.isPinch = false
    this.everSmallScale = false
    this.isSingleRelease = false
    this.amplificationFactor = 1
    // 平移
    this.isTranslate = false
    this.lastTranslateMoveX = null
    this.lastTranslateMoveY = null
    this.lastTranslateX = 0
    this.lastTranslateY = 0
    // 點擊
    this.lastClickTime = null
    this.diiffClickTime = 200
    this.doubleClicke = false
  }

  UNSAFE_componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      // Handler
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._onPanResponderRelease,
      onResponderTerminate : this._handlePanResponderTerminate,
      // Setter
      onStartShouldSetPanResponder: evt => true, // 開始觸碰，是否成為響應者
      onMoveShouldSetPanResponder: evt => true, // 開始移動，是否成為響應者
      onStartShouldSetPanResponderCapture: evt => true, // 開始觸碰，是否捕捉成為響應者
      onMoveShouldSetPanResponderCapture: evt => true,  // 開始移動，是否捕捉成為響應者
      onPanResponderTerminationRequest: evt => true, // 有其他響應者，是否釋放響應權
      onShouldBlockNativeResponder: evt => true // 返回一個布爾值，決定當前組件是否應該阻止原生組件成為JS響應者，默認返回true。目前暫時只支持android
    })
  }

  _handlePanResponderGrant = (e, gestureState) => { 
    // 此callback手指數會抓錯
    // 計算點擊時間
    if (this.lastClickTime) {
      this.diiffClickTime = e.nativeEvent.touches[0].timestamp - this.lastClickTime
    }
    this.lastClickTime = e.nativeEvent.touches[0].timestamp 
    // 執行點擊任務
    if (this.diiffClickTime < 200) { // 雙擊
      if (this.animatedScale._value > 1) { // 縮回 
        this.doubleClicke = true
        Animated.parallel([
          Animated.timing(this.animatedoffsetX,{
            toValue: 0,
            duration: 200
          }),
          Animated.timing(this.animatedoffsetY,{
            toValue: 0,
            duration: 200
          }),
          Animated.timing(this.animatedScale,{
            toValue: 1,
            duration: 200
          })
        ]).start(() => {
          this.doubleClicke = false
          this.setState({isScrollEnabled: true})
        })
      } else if (this.animatedScale._value === 1) { // 放大
        this.doubleClicke = true
        const focusPointX = (e.nativeEvent.touches[0].pageX - width/2)
        const focusPointY = (e.nativeEvent.touches[0].pageY - height/2)
        const offsetX = focusPointX/2-focusPointX // 關注點到雙手中心需要的偏移量
        const offsetY = focusPointY/2-focusPointY // 關注點到雙手中心需要的偏移量         
        Animated.parallel([
          Animated.timing(this.animatedoffsetX,{
            toValue: offsetX,
            duration: 200
          }),
          Animated.timing(this.animatedoffsetY,{
            toValue: offsetY,
            duration: 200
          }),
          Animated.timing(this.animatedScale,{
            toValue: 2,
            duration: 200
          })
        ]).start(() => {
          this.doubleClicke = false
        })
      }
    } 
  }

  _handlePanResponderMove = (e, gestureState) => {
    if (gestureState.numberActiveTouches === 2) {
      // 計算放大倍數
      this.setState({isScrollEnabled: false}) // 縮放時屏蔽滾動
      const dx = Math.abs(e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX)
      const dy = Math.abs(e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY)
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (!this.lastDistance) {
        this.lastDistance = distance // 第一次lastDistance不存在給予把第一次的distance當作lastDistance
      }
      const scale = (1+(distance - this.lastDistance)*this.amplificationFactor/this.lastDistance)*this.animatedScale._value
      this.lastDistance = distance
      if (scale > 3) {
        scale = 3
      } else if (scale < 1) {
        this.everSmallScale = true
        if (scale < 0.5) {
          scale = 0.5
        }
      }
      // 計算偏移距離
      if (!this.isPinch) { 
        // 新一次雙手觸摸鎖定關注點 // 放大到縮小重置縮放 // 如果單手離開螢幕也算重置縮放
        this.focusPointX = ((e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2)/this.animatedScale._value - this.animatedoffsetX._value
        this.focusPointY = ((e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2)/this.animatedScale._value - this.animatedoffsetY._value
      }
      this.isPinch = true // 現在是縮放？
      this.isTranslate = false // 現在是平移？
      this.isSingleRelease = false // 現在是單手放開？
      const magnifierCenterX = (e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2 // 目前雙手中心
      const magnifierCenterY = (e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2 // 目前雙手中心
      const offsetX = magnifierCenterX/scale-this.focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = magnifierCenterY/scale-this.focusPointY // 關注點到雙手中心需要的偏移量 
      if (scale >= 1 && !this.everSmallScale) { 
        // 限制放大超過邊界時的偏移速度
        const offsetBoundaryX = (scale*width/2-width/2)/scale
        const offsetBoundaryY = (scale*height/2-height/2)/scale
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/scale) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(scale*1.5)) : offsetY
      }
      this._animation(offsetX,offsetY,scale,12)
    } else if (gestureState.numberActiveTouches === 1) {
      if (!this.isSingleRelease) {
        this._onPanResponderSingleRelease()
      } else if (this.isSingleRelease && this.animatedScale._value > 1 && Math.abs(gestureState.dx) > 0) {
        // 平移 ? 要在動畫完成後才平移？
        if (!this.isTranslate) { // 第一次平移觸摸時平移量
          this.lastTranslateX = this.animatedoffsetX._value
          this.lastTranslateY = this.animatedoffsetY._value
          this.lastTranslateMoveX = gestureState.dx
          this.lastTranslateMoveY = gestureState.dy
        }
        this.isTranslate = true
        const offsetBoundaryX = (this.animatedScale._value*width/2-width/2)/this.animatedScale._value
        const offsetBoundaryY = (this.animatedScale._value*height/2-height/2)/this.animatedScale._value
        const offsetX = this.lastTranslateX + (gestureState.dx - this.lastTranslateMoveX)/2
        const offsetY = this.lastTranslateY + (gestureState.dy - this.lastTranslateMoveY)/2
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/this.animatedScale._value) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.animatedScale._value*1.5)) : offsetY
        this.animatedoffsetX.setValue(offsetX)
        this.animatedoffsetY.setValue(offsetY)        
      }
    }
    
  }

  // 全部釋放
  _onPanResponderRelease =  (e, gestureState) => {
    if (!this.doubleClicke) {
      if (this.animatedScale._value > 2) {
        this._bigSpringBack(2,this._onPanResponderReleaseResetFlag)
      } else if (this.animatedScale._value >= 1 && this.animatedScale._value <= 2) {
        this._middleSpringBack(null,this._onPanResponderReleaseResetFlag)
      } else if (this.animatedScale._value < 1) {
        this._smallSpringBack(1,this._onPanResponderReleaseResetFlagSmall)
      }
    } 
  }

  // 單手釋放
  _onPanResponderSingleRelease = () => {
    if (this.animatedScale._value > 2) {
      this._bigSpringBack(2,this._onPanResponderSingleReleaseResetFlag)
    } else if (this.animatedScale._value > 1 && this.animatedScale._value <= 2) {
      this._middleSpringBack(null,this._onPanResponderSingleReleaseResetFlag)
    } else if (this.animatedScale._value <= 1) {
      this._smallSpringBack(1,this._onPanResponderSingleReleaseResetFlagSmall)
    }
  }

  _handlePanResponderTerminate =  (e, gestureState) => {
    //console.warn('意外取消')
  }

  _bigSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: this._springHideBlackBlock(scaleValue).offsetX,
        duration: 200
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: this._springHideBlackBlock(scaleValue).offsetY,
        duration: 200
      }),
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200
      })
    ]).start(doneCallBack)
  }

  _middleSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: this._springHideBlackBlock(this.animatedScale._value).offsetX,
        duration: 200
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: this._springHideBlackBlock(this.animatedScale._value).offsetY,
        duration: 200
      })
    ]).start(doneCallBack)
  }

  _smallSpringBack = (scaleValue,doneCallBack) => {
    // 暫時修復BUG用，滾回原本位置
    this.flatlist.getNode().scrollToOffset({
      offset: this.contentOffset,
      animated: true,
    })
    Animated.parallel([
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200,
      }),
      Animated.timing(this.animatedoffsetX,{
        toValue: 0,
        duration: 200,
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: 0,
        duration: 200,
      })
    ]).start(doneCallBack)
  }
  
  _animation = (offsetX,offsetY,scale) => {
    this.animatedoffsetX.setValue(offsetX)
    this.animatedoffsetY.setValue(offsetY)
    this.animatedScale.setValue(scale)   
  }

  _springHideBlackBlock = scale => {
    const offsetBoundaryX = (scale*width/2-width/2)/scale
    const offsetBoundaryY = (scale*height/2-height/2)/scale
    let offsetX = this.animatedoffsetX._value
    let offsetY = this.animatedoffsetY._value
    if (Math.abs(this.animatedoffsetX._value) > offsetBoundaryX) {
      offsetX = offsetBoundaryX*Math.sign(this.animatedoffsetX._value)
    }
    if (Math.abs(this.animatedoffsetY._value) > offsetBoundaryY) {
      offsetY = offsetBoundaryY*Math.sign(this.animatedoffsetY._value)
    }
    return {offsetX,offsetY}
  }

  _onPanResponderReleaseResetFlagSmall = () => {
    this.setState({isScrollEnabled: true})
    this._onPanResponderReleaseResetFlag()
  }

  _onPanResponderReleaseResetFlag = () => {
    this.everSmallScale = false
    this._resetFlag()
  }

  _onPanResponderSingleReleaseResetFlagSmall = () => {
    this.setState({isScrollEnabled: true})
    this._onPanResponderSingleReleaseResetFlag()
  }


  _onPanResponderSingleReleaseResetFlag = () => {
    this._resetFlag()
  }

  _resetFlag = () => {
    this.lastDistance = null
    this.isPinch = false
    this.isTranslate = false
    this.isSingleRelease = true    
  }

  _onScroll = ({nativeEvent}) => {
    //const {layoutMeasurement, scrollY, contentSize,contentOffset} = nativeEvent
    this.contentOffset = nativeEvent.contentOffset.y
  }

  render() {
    return (
      <AnimatedFlatList
        {...this.gestureHandlers.panHandlers}
        style={[styles.animatedFlatList,{
          height: this.animatedheight,
          transform: [
            {scaleX: this.animatedScale},
            {scaleY: this.animatedScale},
            {translateX: this.animatedoffsetX},
            {translateY: this.animatedoffsetY}
          ]
        }]}
        contentContainerStyle={styles.contentContainerStyle}
        ref={ref => this.flatlist = ref}
        removeClippedSubviews
        onEndReachedThreshold={0.1}
        data={this.props.content}
        numColumns={1}
        scrollEnabled={this.state.isScrollEnabled}
        showsVerticalScrollIndicator={false}
        horizontal={false}
        onScroll={this._onScroll}
        renderItem={({ item }) =>
          <Image
            resizeMode={'contain'} 
            style={{width, height: item.height, backgroundColor: 'black'}}
            source={{uri: item.key}}
            />
          }
      />
    )
  }
}

const styles = StyleSheet.create({
  animatedFlatList: {
    //
  },
  contentContainerStyle: {
    //justifyContent: 'center',
    //alignItems: 'center'
  }}
)